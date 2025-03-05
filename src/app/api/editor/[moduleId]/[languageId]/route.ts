import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// 获取翻译资源
export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string; languageId: string }> },
) {
  const { moduleId, languageId } = await params;

  try {
    // 获取模块
    const foundModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!foundModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // 获取项目和源语言
    const project = await prisma.project.findUnique({
      where: { id: foundModule.projectId },
      include: {
        sourceLanguage: true, // 包含源语言信息
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 获取目标语言
    const targetLanguage = await prisma.language.findUnique({
      where: { id: languageId },
    });

    if (!targetLanguage) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 },
      );
    }

    // 获取源语言资源并按 order 排序
    const sourceLanguageResources = await prisma.languageResource.findMany({
      where: {
        moduleId: moduleId,
        languageId: project.sourceLanguageId, // 使用源语言作为基础
      },
      orderBy: {
        order: "asc", // 按 order 排序
      },
    });

    // 获取目标语言的翻译资源
    const targetLanguageResources = await prisma.languageResource.findMany({
      where: {
        moduleId: moduleId,
        languageId: languageId,
      },
    });

    // 合并源语言和目标语言的资源，并添加 order
    const resources = sourceLanguageResources.map((resource, index) => {
      const targetResource = targetLanguageResources.find(
        (tr) => tr.key === resource.key,
      );
      return {
        key: resource.key,
        sourceValue: resource.value, // 源语言的值
        value: targetResource ? targetResource.value : "", // 目标语言的翻译值
        order: resource.order || index, // 使用源语言的 order，若无，则使用索引
      };
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error("Error fetching translation data:", error);
    return NextResponse.json(
      { error: "Failed to fetch translation data" },
      { status: 500 },
    );
  }
}

// 保存翻译数据
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ moduleId: string; languageId: string }> },
) {
  const { moduleId, languageId } = await params;

  try {
    const data = await req.json(); // 获取请求中的翻译数据

    // 获取模块
    const foundModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!foundModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // 获取项目和源语言
    const project = await prisma.project.findUnique({
      where: { id: foundModule.projectId },
      include: {
        sourceLanguage: true, // 包含源语言信息
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 获取目标语言
    const targetLanguage = await prisma.language.findUnique({
      where: { id: languageId },
    });

    if (!targetLanguage) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 },
      );
    }

    // 遍历翻译数据，保存每个翻译项
    const updatedResources = data.map(
      async (resource: { key: string; value: string; order: number }) => {
        // 检查是否已有该语言资源
        let languageResource = await prisma.languageResource.findUnique({
          where: {
            moduleId_languageId_key: {
              moduleId: moduleId,
              languageId: languageId,
              key: resource.key,
            },
          },
        });

        // 如果没有，创建新记录
        if (!languageResource) {
          languageResource = await prisma.languageResource.create({
            data: {
              moduleId: moduleId,
              languageId: languageId,
              key: resource.key,
              value: resource.value,
              order: resource.order, // 使用提供的 order
            },
          });
        } else {
          // 如果已有，更新翻译值
          languageResource = await prisma.languageResource.update({
            where: {
              id: languageResource.id,
            },
            data: {
              value: resource.value,
              order: resource.order, // 更新 order
            },
          });
        }

        return languageResource;
      },
    );

    // 等待所有翻译更新完成
    await Promise.all(updatedResources);

    return NextResponse.json({ message: "Translation saved successfully" });
  } catch (error) {
    console.error("Error saving translation data:", error);
    return NextResponse.json(
      { error: "Failed to save translation data" },
      { status: 500 },
    );
  }
}
