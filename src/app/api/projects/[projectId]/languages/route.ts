import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    // 获取项目的源语言 ID
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { sourceLanguageId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sourceLanguageId = project.sourceLanguageId;

    // 获取所有模块的模块ID
    const modules = await prisma.module.findMany({
      where: { projectId },
      select: { id: true },
    });

    // 获取每个目标语言的翻译进度
    const targetLanguages = await prisma.projectLanguages.findMany({
      where: { projectId },
      include: {
        language: true, // 获取语言信息
      },
      orderBy: {
        order: "asc", // 按照 order 字段排序目标语言
      },
    });

    const targetLanguagesData = await Promise.all(
      targetLanguages.map(async (pl) => {
        const language = pl.language;

        // 获取每个模块在源语言下的资源数量
        const totalResources = await prisma.languageResource.count({
          where: {
            moduleId: { in: modules.map((module) => module.id) },
            languageId: sourceLanguageId,
          },
        });

        // 获取每个模块在目标语言下的翻译数量
        const translatedResources = await prisma.languageResource.count({
          where: {
            moduleId: { in: modules.map((module) => module.id) },
            languageId: language.id,
            value: { not: { equals: "" } }, // 排除空字符串
          },
        });

        // 计算翻译进度
        const progress =
          totalResources === 0
            ? 0
            : (translatedResources / totalResources) * 100;

        return {
          id: language.id,
          name: language.name,
          code: language.code,
          progress: parseFloat(progress.toFixed(2)), // 保留两位小数
        };
      }),
    );

    return NextResponse.json(targetLanguagesData); // 返回每个目标语言的进度
  } catch (error) {
    console.error("Error fetching translation progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch translation progress" },
      { status: 500 },
    );
  }
}
