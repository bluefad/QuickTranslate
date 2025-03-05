/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma";
import JSZip from "jszip"; // 引入 JSZip
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ languageId: string; projectId: string }> }) {
  const { languageId, projectId } =await params;

  try {
    // 获取项目和语言信息
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, sourceLanguageId: true },
    });

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const sourceLanguageId = project.sourceLanguageId;

    // 获取语言的代码
    const language = await prisma.language.findUnique({
      where: { id: languageId },
      select: { code: true },
    });

    if (!language) {
      return NextResponse.json({ message: "Language not found" }, { status: 404 });
    }

    const languageCode = language.code;

    // 获取所有模块及其翻译数据
    const modules = await prisma.module.findMany({
      where: { projectId },
      select: { id: true, name: true },
    });

    // 创建 ZIP 文件
    const zip = new JSZip();

    for (const iterateModule of modules) {
      // 获取并处理模块的翻译数据
      const sourceKeys = await prisma.languageResource.findMany({
        where: {
          moduleId: iterateModule.id,
          languageId: sourceLanguageId,
        },
        select: { key: true },
      });

      const translations = await prisma.languageResource.findMany({
        where: {
          moduleId: iterateModule.id,
          languageId,
          key: { in: sourceKeys.map((item) => item.key) },
        },
        select: { key: true, value: true },
      });

      const nestedTranslations: { [key: string]: any } = {}; // 确保支持多层嵌套结构

      translations.forEach((translation) => {
        const parts = translation.key.split("."); // 使用 '.' 分割为模块和键
        let currentLevel = nestedTranslations;

        parts.forEach((part, index) => {
          if (!currentLevel[part]) {
            currentLevel[part] = index === parts.length - 1 ? translation.value : {}; // 最后一个键存放翻译内容，其余是空对象
          }
          currentLevel = currentLevel[part]; // 深入到下一级
        });
      });

      // 如果有未翻译的 key，使用空字符串填充
      sourceKeys.forEach((item) => {
        const parts = item.key.split(".");
        let currentLevel = nestedTranslations;

        parts.forEach((part, index) => {
          if (!currentLevel[part]) {
            currentLevel[part] = index === parts.length - 1 ? "" : {}; // 最后一个键存放空字符串，其余是空对象
          }
          currentLevel = currentLevel[part]; // 深入到下一级
        });
      });

      // 添加模块文件到 ZIP 中
      const moduleFileName = `${iterateModule.name}.json`;
      zip.file(moduleFileName, JSON.stringify(nestedTranslations, null, 2)); // 添加到ZIP文件
    }

    const zipContent = await zip.generateAsync({ type: "blob" });

    // 返回 ZIP 文件和语言及项目名称
    return new NextResponse(zipContent, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=${project.name}.${languageCode}.zip`,
      },
    });
  } catch (error) {
    console.error("Error exporting translations:", error);
    return NextResponse.json({ message: "Error exporting translations" }, { status: 500 });
  }
}
