/* eslint-disable @typescript-eslint/no-unused-vars */
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// 获取项目模块的原始语言 key 列表
export async function POST(
  req: Request,
  { params }: { params: Promise<{ languageId: string; moduleId: string }> },
) {
  const { moduleId, languageId } = await params;
  const { data } = await req.json(); // 获取上传的数据，包含语言 ID 和导入的内容

  try {
    // 1. 获取项目的源语言ID
    const foundModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { projectId: true },
    });

    if (!foundModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: foundModule.projectId },
      select: { sourceLanguageId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sourceLanguageId = project.sourceLanguageId;

    // 2. 获取原始语言的 key 列表，包括 order 字段
    const originalResources = await prisma.languageResource.findMany({
      where: { moduleId, languageId: sourceLanguageId },
      select: { key: true, order: true },
    });

    // 将原始语言的 key 和 order 存储在一个 Map 中，便于快速查找
    const originalKeyToOrderMap = new Map<string, number>();
    originalResources.forEach((resource) => {
      originalKeyToOrderMap.set(resource.key, resource.order ?? 0); // 默认 order 为 0
    });

    // 3. 遍历导入数据，进行校验并更新或插入
    for (const row of data) {
      const { key, sourceLanguage, targetLanguage } = row;

      // 校验当前的 key 是否在原始语言的 key 列表中
      if (!originalKeyToOrderMap.has(key)) {
        console.log(
          `Key ${key} does not match the source language keys. Skipping.`,
        );
        continue; // 如果 key 不匹配，跳过
      }

      const order = originalKeyToOrderMap.get(key) || 0; // 获取原始语言的 order

      // 根据 projectId, moduleId 和 languageId 查找对应的资源
      const originalResource = await prisma.languageResource.findFirst({
        where: {
          key,
          languageId: languageId, // 匹配指定语言
          moduleId, // 匹配指定模块
        },
      });

      if (originalResource) {
        // 如果找到了对应的资源，进行更新
        await prisma.languageResource.update({
          where: { id: originalResource.id },
          data: {
            value: targetLanguage, // 更新翻译
            order: order, // 使用原始语言的 order
          },
        });
      } else {
        // 如果没有找到对应的资源，创建新的
        await prisma.languageResource.create({
          data: {
            key,
            value: targetLanguage,
            languageId: languageId, // 匹配语言
            moduleId: moduleId, // 匹配模块
            order: order, // 使用原始语言的 order
          },
        });
      }
    }

    return NextResponse.json({ message: "Import successful" });
  } catch (error) {
    console.error("Error during import:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
