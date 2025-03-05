import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string; languageId: string }> },
) {
  const { moduleId, languageId } = await params;

  try {
    // 1. 获取模块的项目ID
    const foundModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { projectId: true },
    });

    if (!foundModule) {
      return NextResponse.json(
        { message: "Module not found" },
        { status: 404 },
      );
    }

    const projectId = foundModule.projectId;

    // 2. 获取项目的源语言ID
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { sourceLanguageId: true },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const sourceLanguageId = project.sourceLanguageId;

    // 3. 获取源语言的所有键
    const sourceKeys = await prisma.languageResource.findMany({
      where: {
        moduleId,
        languageId: sourceLanguageId, // 获取源语言的翻译键
      },
      select: {
        key: true,
        order: true, // 获取 order 字段，但不导出
      },
    });

    if (sourceKeys.length === 0) {
      return NextResponse.json(
        { message: "No keys found for source language" },
        { status: 404 },
      );
    }

    // 4. 获取目标语言的翻译
    const translations = await prisma.languageResource.findMany({
      where: {
        moduleId,
        languageId,
        key: {
          in: sourceKeys.map((item) => item.key), // 只获取源语言已有的 key 的翻译
        },
      },
      select: {
        key: true,
        value: true, // 获取目标语言的翻译内容
        order: true, // 获取 order 字段，但不导出
      },
    });

    // 5. 组织翻译数据为嵌套结构
    const nestedTranslations: {
      [module: string]: { [key: string]: string } | string;
    } = {};

    translations.forEach((translation) => {
      const parts = translation.key.split("."); // 使用 '.' 分割为模块和键

      // 如果该翻译有模块部分（即部分长度大于1），则创建嵌套结构
      if (parts.length > 1) {
        const [module, key] = parts;

        if (!nestedTranslations[module]) {
          nestedTranslations[module] = {}; // 初始化模块
        }

        (nestedTranslations[module] as { [key: string]: string })[key] =
          translation.value; // 填充目标语言的翻译
      } else {
        // 如果没有模块部分，直接把键作为顶级键添加
        nestedTranslations[parts[0]] = translation.value;
      }
    });

    // 6. 如果有未翻译的 key，使用空字符串填充
    sourceKeys.forEach((item) => {
      const parts = item.key.split(".");
      const [module, key] = parts.length > 1 ? parts : [parts[0], undefined];

      if (!nestedTranslations[module]) {
        nestedTranslations[module] = {}; // 初始化模块
      }

      if (
        key &&
        !(nestedTranslations[module] as { [key: string]: string })[key]
      ) {
        (nestedTranslations[module] as { [key: string]: string })[key] = ""; // 填充未翻译的键
      } else if (!key && typeof nestedTranslations[module] !== "string") {
        nestedTranslations[module] = ""; // 填充顶级键
      }
    });

    // 7. 返回格式化的翻译数据，不包括 order 字段
    return NextResponse.json(nestedTranslations, { status: 200 });
  } catch (error) {
    console.error("Error exporting translations:", error);
    return NextResponse.json(
      { message: "Error exporting translations" },
      { status: 500 },
    );
  }
}
