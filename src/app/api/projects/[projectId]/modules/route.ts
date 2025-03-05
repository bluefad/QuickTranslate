import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取某个项目的所有模块及其源语言资源数量
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    // 获取项目的源语言（基准语言）
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sourceLanguage: true, // 获取项目的源语言
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sourceLanguageId = project.sourceLanguageId;

    // 获取模块列表及其源语言的语言资源数量
    const modules = await prisma.module.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        _count: {
          select: {
            languageResources: {
              where: {
                languageId: sourceLanguageId, // 只计算源语言的资源数量
              },
            },
          },
        },
      },
    });

    // 将每个模块的资源数量包含到模块中
    const modulesWithResourceCount = modules.map((module) => ({
      id: module.id,
      name: module.name,
      description: module.description,
      resourceCount: module._count.languageResources, // 获取源语言资源数量
    }));

    // 返回模块列表，包括资源数量
    return NextResponse.json(modulesWithResourceCount);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 },
    );
  }
}

// 创建新的模块
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { name, description } = await request.json();

  try {
    // 使用 findFirst 来查找具有相同名称的模块
    const existingModule = await prisma.module.findFirst({
      where: {
        projectId: projectId,
        name: name, // 查找项目中是否已经有同名模块
      },
    });

    if (existingModule) {
      return NextResponse.json(
        { error: "A module with this name already exists in the project" },
        { status: 400 },
      );
    }

    // 创建新的模块
    const newModule = await prisma.module.create({
      data: {
        projectId: projectId,
        name,
        description,
      },
    });

    // 返回新创建的模块信息
    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create module" },
      { status: 500 },
    );
  }
}
