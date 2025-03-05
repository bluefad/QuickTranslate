import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取单个项目
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId, // 根据传递的 projectId 查找项目
      },
      include: {
        sourceLanguage: true, // 包括源语言
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

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
};

// 删除一个项目及相关数据
export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await params;

  try {
    // 启动一个事务
    const deletedProject = await prisma.$transaction(async (prisma) => {
      // 1. 找到相关模块 IDs
      const modulesToDelete = await prisma.module.findMany({
        where: {
          projectId: projectId, // 根据项目ID查找相关模块
        },
        select: { id: true }, // 只获取模块 ID
      });

      const moduleIds = modulesToDelete.map((module) => module.id);

      // 2. 删除与项目相关的 LanguageResource
      await prisma.languageResource.deleteMany({
        where: {
          moduleId: { in: moduleIds }, // 根据模块 ID 删除相关的语言资源
        },
      });

      // 3. 删除与项目相关的 Module
      await prisma.module.deleteMany({
        where: {
          projectId: projectId, // 根据项目ID查找相关模块
        },
      });

      // 4. 删除与项目相关的 ProjectLanguages
      await prisma.projectLanguages.deleteMany({
        where: {
          projectId: projectId, // 根据项目ID查找相关目标语言
        },
      });

      // 5. 删除项目本身
      return await prisma.project.delete({
        where: {
          id: projectId, // 根据传递的 projectId 删除项目
        },
      });
    });

    return NextResponse.json(deletedProject);
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
};

// 更新一个项目
export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await params;

  try {
    const {
      name,
      identifier,
      description,
      sourceLanguageId,
      targetLanguagesIds,
    } = await request.json();

    if (!name || !identifier || !sourceLanguageId) {
      return NextResponse.json(
        { message: "Name, identifier, and source language are required" },
        { status: 400 },
      );
    }

    // 检查 identifier 是否已存在
    const existingProject = await prisma.project.findUnique({
      where: { identifier },
    });

    if (existingProject && existingProject.id !== projectId) {
      return NextResponse.json(
        { message: "Project identifier must be unique" },
        { status: 400 },
      );
    }

    // 查找项目
    const foundProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!foundProject) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    // 查找源语言
    const sourceLanguage = await prisma.language.findUnique({
      where: { id: sourceLanguageId },
    });

    if (!sourceLanguage) {
      return NextResponse.json(
        { message: "Source language not found" },
        { status: 400 },
      );
    }

    // 查找目标语言 IDs
    const targetLanguages = await prisma.language.findMany({
      where: { id: { in: targetLanguagesIds } },
    });

    if (targetLanguages.length === 0) {
      return NextResponse.json(
        { message: "Target languages not found" },
        { status: 400 },
      );
    }

    // 如果源语言发生变化，更新 LanguageResource 中的 sourceLanguageId
    if (sourceLanguage.id !== foundProject.sourceLanguageId) {
      const modules = await prisma.module.findMany({
        where: { projectId: projectId },
      });

      const moduleIds = modules.map((module) => module.id);

      await prisma.languageResource.updateMany({
        where: {
          moduleId: { in: moduleIds },
          languageId: foundProject.sourceLanguageId,
        },
        data: {
          languageId: sourceLanguage.id, // 更新为新的 sourceLanguageId
        },
      });
    }

    // 处理 ProjectLanguages 更新
    const currentProjectLanguages = await prisma.projectLanguages.findMany({
      where: { projectId: projectId },
      include: { language: true },
    });

    const currentLanguageIds = currentProjectLanguages.map(
      (projectLanguage) => projectLanguage.languageId,
    );

    const languagesToAdd = targetLanguagesIds.filter(
      (id: string) => !currentLanguageIds.includes(id),
    );

    const languagesToRemove = currentLanguageIds.filter(
      (id: string) => !targetLanguagesIds.includes(id),
    );

    if (languagesToRemove.length > 0) {
      // Fetch modules related to the project first
      const modules = await prisma.module.findMany({
        where: { projectId: projectId },
      });

      // 获取需要删除的语言资源 ID
      const languageResourceIdsToDelete =
        await prisma.languageResource.findMany({
          where: {
            languageId: { in: languagesToRemove },
            moduleId: { in: modules.map((module) => module.id) }, // 引用模块 ID
          },
          select: { id: true },
        });

      // 删除相关的语言资源
      await prisma.languageResource.deleteMany({
        where: {
          id: {
            in: languageResourceIdsToDelete.map((resource) => resource.id),
          },
        },
      });

      // 删除与这些语言相关的 ProjectLanguages
      await prisma.projectLanguages.deleteMany({
        where: {
          projectId: projectId,
          languageId: { in: languagesToRemove },
        },
      });
    }

    // 更新 ProjectLanguages 和 LanguageResource
    await prisma.projectLanguages.updateMany({
      where: {
        projectId: projectId,
        languageId: { in: targetLanguagesIds },
      },
      data: {
        order:
          targetLanguages.findIndex(
            (language) => language.id === targetLanguagesIds,
          ) + 1,
      },
    });

    // 添加新语言
    const addedLanguages = targetLanguages.filter((language) =>
      languagesToAdd.includes(language.id),
    );

    if (addedLanguages.length > 0) {
      await prisma.projectLanguages.createMany({
        data: addedLanguages.map((language) => ({
          projectId: projectId,
          languageId: language.id,
          order: languagesToAdd.indexOf(language.id) + 1,
        })),
      });
    }

    // 最后按照 targetLanguagesIds 的顺序更新所有项目语言的 order
    for (let i = 0; i < targetLanguagesIds.length; i++) {
      await prisma.projectLanguages.update({
        where: {
          projectId_languageId: {
            projectId: projectId,
            languageId: targetLanguagesIds[i],
          },
        },
        data: {
          order: i + 1, // 按照 targetLanguagesIds 的顺序设置 order
        },
      });
    }

    // 获取更新后的项目
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        name,
        identifier,
        description,
        sourceLanguageId: sourceLanguage.id,
      },
      include: {
        sourceLanguage: true,
        projectLanguages: {
          include: {
            language: true,
          },
        },
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
};
