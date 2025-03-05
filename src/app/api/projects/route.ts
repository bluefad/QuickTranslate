/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取所有项目
export async function GET(request: Request) {
  try {
    // 获取所有项目，并包含关联的源语言和目标语言，并按 order 排序目标语言
    const projects = await prisma.project.findMany({
      include: {
        sourceLanguage: true, // 获取项目的源语言
        projectLanguages: {
          include: {
            language: true, // 包括所有目标语言
          },
          orderBy: {
            order: "asc", // 按照 order 字段排序目标语言
          },
        },
      },
    });

    // 获取每个项目的源语言待翻译记录数和目标语言数量
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        // 获取当前项目的所有模块
        const modules = await prisma.module.findMany({
          where: {
            projectId: project.id,
          },
        });

        // 计算待翻译的记录数
        const totalLanguageResources = await Promise.all(
          modules.map(async (module) => {
            // 统计每个模块下符合条件的 LanguageResource
            return await prisma.languageResource.count({
              where: {
                languageId: project.sourceLanguageId,
                moduleId: module.id,
              },
            });
          }),
        );

        // 汇总所有模块的待翻译记录数
        const resourceCount = totalLanguageResources.reduce(
          (total, count) => total + count,
          0,
        );

        return {
          ...project,
          resourceCount, // 源语言待翻译记录数
          languageCount: project.projectLanguages.length, // 目标语言数量
        };
      }),
    );

    return NextResponse.json(projectsWithCounts);
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
}

// 创建一个新项目
export async function POST(request: Request) {
  try {
    const {
      name,
      identifier,
      description,
      sourceLanguageId,
      targetLanguagesIds, // 更新字段，包含目标语言及其排序
    } = await request.json();

    if (!name || !identifier || !sourceLanguageId) {
      return NextResponse.json(
        {
          message: "Name, identifier, source language are required",
        },
        { status: 400 },
      );
    }

    // 检查项目标识符是否已存在
    const existingProject = await prisma.project.findUnique({
      where: { identifier },
    });

    if (existingProject) {
      return NextResponse.json(
        { message: "Project identifier must be unique" },
        { status: 400 },
      );
    }

    // 查找源语言
    const source_Language = await prisma.language.findUnique({
      where: { id: sourceLanguageId },
    });

    if (!source_Language) {
      return NextResponse.json(
        { message: "Source language not found" },
        { status: 400 },
      );
    }

    // 查找目标语言的 ID 和排序
    const target_Languages = await prisma.language.findMany({
      where: {
        id: { in: targetLanguagesIds?.map((lang: { id: string }) => lang.id) }, // 根据目标语言ID查找
      },
    });

    if (target_Languages.length === 0) {
      return NextResponse.json(
        { message: "Target languages not found" },
        { status: 400 },
      );
    }

    // 创建项目并连接源语言和目标语言
    const newProject = await prisma.project.create({
      data: {
        name,
        identifier, // 使用传入的 identifier
        description,
        sourceLanguageId: source_Language.id, // 设置源语言ID
        projectLanguages: {
          create: targetLanguagesIds?.map(
            (language: { id: string }, index: number) => ({
              language: {
                connect: { id: language.id }, // 使用 ID 连接目标语言
              },
              order: index + 1, // 设置排序顺序，假设传入的 targetLanguages 已经按照期望顺序排序
            }),
          ),
        },
      },
      include: {
        sourceLanguage: true,
        projectLanguages: {
          include: {
            language: true, // 包括目标语言
          },
          orderBy: {
            order: "asc", // 按照 order 字段排序目标语言
          },
        },
      },
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
}
