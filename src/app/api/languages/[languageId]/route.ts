import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ languageId: string }> },
) {
  const { languageId } = await params;

  try {
    // 查询数据库获取语言数据
    const language = await prisma.language.findUnique({
      where: {
        id: languageId, // 使用语言 ID 查询
      },
    });

    if (!language) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(language); // 返回语言数据
  } catch (error) {
    console.error("Error fetching language:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
