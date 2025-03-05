import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取单个模块信息
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; moduleId: string }> },
) {
  const { projectId, moduleId } = await params;

  try {
    const foundModule = await prisma.module.findUnique({
      where: {
        id: moduleId,
      },
    });

    if (!foundModule || foundModule.projectId !== projectId) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json(foundModule);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 },
    );
  }
}

// 更新单个模块
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string; moduleId: string }> },
) {
  const { projectId, moduleId } = await params;
  const { name, description } = await request.json();

  try {
    const updatedModule = await prisma.module.update({
      where: {
        id: moduleId,
      },
      data: {
        name,
        description,
      },
    });

    if (updatedModule.projectId !== projectId) {
      return NextResponse.json(
        { error: "Module not found in this project" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedModule);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 },
    );
  }
}

// 删除单个模块
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; moduleId: string }> },
) {
  const { projectId, moduleId } = await params;

  try {
    // 查找该模块是否存在
    const foundModule = await prisma.module.findUnique({
      where: {
        id: moduleId,
      },
    });

    if (!foundModule || foundModule.projectId !== projectId) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // 删除关联的 LanguageResource 数据
    await prisma.languageResource.deleteMany({
      where: {
        moduleId: moduleId,
      },
    });

    // 删除该模块
    await prisma.module.delete({
      where: {
        id: moduleId,
      },
    });

    return NextResponse.json({
      message: "Module and associated resources deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete module" },
      { status: 500 },
    );
  }
}
