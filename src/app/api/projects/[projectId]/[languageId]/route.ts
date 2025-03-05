// src/app/api/projects/[projectId]/modules/[languageId]/translated/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; languageId: string }> },
) {
  const { projectId, languageId } = await params;

  try {
    // 获取项目的基准语言 sourceLanguageId
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
      select: { id: true, name: true, description: true },
    });

    // 获取每个模块在源语言下的资源数量
    const moduleTranslationStats = await Promise.all(
      modules.map(async (module) => {
        // 获取源语言下的翻译条目数量
        const sourceLanguageResources = await prisma.languageResource.count({
          where: {
            moduleId: module.id,
            languageId: sourceLanguageId,
          },
        });

        // 获取目标语言下的翻译条目数量，排除空字符串的值
        const targetLanguageResources = await prisma.languageResource.count({
          where: {
            moduleId: module.id,
            languageId: languageId,
            value: {
              not: "", // 排除空字符串
            },
          },
        });

        // 计算翻译进度
        const translationRatio =
          sourceLanguageResources === 0
            ? 0
            : (targetLanguageResources / sourceLanguageResources) * 100;

        return {
          id: module.id,
          name: module.name,
          description: module.description,
          totalKeys: sourceLanguageResources,
          translatedKeys: targetLanguageResources,
          translationRatio: parseFloat(translationRatio.toFixed(2)), // 保留两位小数
        };
      }),
    );

    return NextResponse.json(moduleTranslationStats); // 返回模块翻译统计信息
  } catch (error) {
    console.error("Error fetching modules with translation stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules with translation stats" },
      { status: 500 },
    );
  }
}
