import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// 获取项目模块的原始语言 key 列表
export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;

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

    // 查询数据库，获取当前模块和语言的原始语言键（假设原始语言存储在某个字段）
    const foundResources = await prisma.languageResource.findMany({
      where: {
        moduleId,
        languageId: sourceLanguageId, // 语言ID应当为原始语言ID
      },
      select: {
        key: true, // 假设数据库字段名为 "key"
      },
    });

    // 如果没有找到数据，返回空数组
    if (foundResources.length === 0) {
      return NextResponse.json({ keys: [] });
    }

    // 获取所有原始的 key
    const keys = foundResources.map((item) => item.key);

    // 返回原始语言的 key 列表
    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Error fetching original keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch original keys" },
      { status: 500 },
    );
  }
}

// 处理 POST 请求，导入新的资源（完全插入）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }, // 获取 moduleId 从 URL 参数
) {
  const { moduleId } = await params; // Ensure `params` is awaited before using it
  const { resources } = await request.json(); // 从请求体获取扁平化后的 resources

  if (!resources || !Array.isArray(resources)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    // 获取模块的信息，包括关联的项目和源语言
    const existingModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { projectId: true },
    });

    if (!existingModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // 获取项目的源语言 ID
    const project = await prisma.project.findUnique({
      where: { id: existingModule.projectId },
      select: { sourceLanguageId: true }, // 获取 sourceLanguageId
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 获取源语言
    const sourceLanguage = await prisma.language.findUnique({
      where: { id: project.sourceLanguageId },
    });

    if (!sourceLanguage) {
      return NextResponse.json(
        { error: "Source language not found" },
        { status: 404 },
      );
    }

    // 添加 languageId 到每个资源（如果没有传递 languageId）
    resources.forEach((resource) => {
      if (!resource.languageId) {
        resource.languageId = sourceLanguage.id; // 使用源语言的 ID 作为语言 ID
      }
    });

    // 验证资源数据的完整性，确保资源的必需字段都存在
    resources.forEach((resource) => {
      if (
        !resource.key ||
        !resource.value ||
        !resource.moduleId ||
        !resource.languageId
      ) {
        console.error("Invalid resource data:", resource);
        throw new Error("Missing required fields in resource");
      }
    });

    // 如果没有传递 `order`，则使用插入的顺序
    resources.forEach((resource, index) => {
      if (resource.order === undefined) {
        resource.order = index; // 如果没有传递 order，使用索引作为顺序
      }
    });

    // 根据 order 排序资源
    resources.sort((a, b) => a.order - b.order);

    // 批量插入资源到数据库
    const createdResources = await prisma.languageResource.createMany({
      data: resources,
    });

    return NextResponse.json(
      { message: "Resources added successfully", createdResources },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// 处理 PUT 请求，更新现有的资源（增、删、改）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }, // 获取 moduleId 从 URL 参数
) {
  const { moduleId } = await params;
  const { resources } = await request.json();

  if (!resources || !Array.isArray(resources)) {
    return NextResponse.json(
      { error: "Invalid resources format." },
      { status: 400 },
    );
  }

  try {
    // 获取模块信息，包括关联的项目和源语言
    const existingModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { projectId: true },
    });

    if (!existingModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // 获取项目的源语言 ID
    const project = await prisma.project.findUnique({
      where: { id: existingModule.projectId },
      select: { sourceLanguageId: true }, // 获取 sourceLanguageId
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sourceLanguageId = project.sourceLanguageId;

    // 获取现有资源
    const existingResources = await prisma.languageResource.findMany({
      where: {
        moduleId,
        languageId: sourceLanguageId, // 这里添加 sourceLanguageId 限制
      },
    });

    // 转换为 Map 以方便比较
    const existingResourcesMap = new Map(
      existingResources.map((res) => [res.key, res]),
    );

    const resourcesToAdd = [];
    const resourcesToDelete = [];
    const resourcesToUpdate = [];

    // 处理新资源
    for (const newResource of resources) {
      // 如果没有传递 languageId，自动使用源语言 ID
      if (!newResource.languageId) {
        newResource.languageId = sourceLanguageId; // 使用源语言 ID
      }

      const existingResource = existingResourcesMap.get(newResource.key);

      if (existingResource) {
        // 更新资源
        if (existingResource.value !== newResource.value) {
          resourcesToUpdate.push(newResource);
        }
        existingResourcesMap.delete(newResource.key); // 已处理，删除
      } else {
        // 新资源
        resourcesToAdd.push(newResource);
      }
    }

    // 删除剩余的资源（已在数据库中，但不在当前请求中）
    resourcesToDelete.push(...existingResourcesMap.values());

    // 插入新资源
    if (resourcesToAdd.length > 0) {
      await prisma.languageResource.createMany({
        data: resourcesToAdd,
      });
    }

    // 删除旧资源
    if (resourcesToDelete.length > 0) {
      const deleteIds = resourcesToDelete.map((res) => res.id);
      await prisma.languageResource.deleteMany({
        where: { id: { in: deleteIds } },
      });
    }

    // 更新现有资源
    for (const updatedResource of resourcesToUpdate) {
      await prisma.languageResource.update({
        where: { id: updatedResource.id },
        data: { value: updatedResource.value },
      });
    }

    return NextResponse.json(
      { message: "Resources successfully updated" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
