/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// 获取指定模块的原始语言资源列表
export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;

  try {
    // 获取指定模块的 project 以及原始语言ID (sourceLanguageId)
    const foundModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        project: {
          select: {
            sourceLanguageId: true, // 获取 sourceLanguageId
          },
        },
      },
    });

    if (!foundModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const sourceLanguageId = foundModule.project.sourceLanguageId;

    // 获取该语言下的语言资源
    const languageResources = await prisma.languageResource.findMany({
      where: {
        moduleId: moduleId,
        languageId: sourceLanguageId, // 使用获取的 sourceLanguageId
      },
      orderBy: {
        order: "asc", // 按照 order 字段升序排列
      },
    });

    return NextResponse.json(languageResources);
  } catch (error) {
    console.error("Error fetching language resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch language resources" },
      { status: 500 },
    );
  }
}

// 更新指定模块的原始语言资源列表
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const resourcesToUpdate = await req.json(); // 假设客户端传来的数据是数组

  try {
    // 获取指定模块的 project 以及原始语言ID (sourceLanguageId)
    const foundModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        project: {
          select: {
            sourceLanguageId: true, // 获取 sourceLanguageId
          },
        },
      },
    });

    if (!foundModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const sourceLanguageId = foundModule.project.sourceLanguageId;

    // 更新资源
    const updatedResources = await Promise.all(
      resourcesToUpdate.map(async (resource: any) => {
        return prisma.languageResource.update({
          where: { id: resource.id },
          data: {
            value: resource.value,
            languageId: sourceLanguageId, // 使用原始语言 ID
          },
        });
      }),
    );

    return NextResponse.json(updatedResources);
  } catch (error) {
    console.error("Error updating language resources:", error);
    return NextResponse.json(
      { error: "Failed to update language resources" },
      { status: 500 },
    );
  }
}

// 删除指定语言资源
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const resourceIds = await req.json(); // 假设客户端传来的是要删除的资源 ID 数组

  try {
    // 获取指定模块的 project 以及原始语言ID (sourceLanguageId)
    const foundModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        project: {
          select: {
            sourceLanguageId: true, // 获取 sourceLanguageId
          },
        },
      },
    });

    if (!foundModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const sourceLanguageId = foundModule.project.sourceLanguageId;

    // 删除指定资源
    const deletedResources = await prisma.languageResource.deleteMany({
      where: {
        id: {
          in: resourceIds,
        },
        moduleId: moduleId,
        languageId: sourceLanguageId, // 使用原始语言 ID
      },
    });

    return NextResponse.json(deletedResources);
  } catch (error) {
    console.error("Error deleting language resources:", error);
    return NextResponse.json(
      { error: "Failed to delete language resources" },
      { status: 500 },
    );
  }
}
