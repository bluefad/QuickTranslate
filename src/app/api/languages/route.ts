/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取所有语言
export async function GET(request: Request) {
  try {
    const languages = await prisma.language.findMany();
    return NextResponse.json(languages);
  } catch (error) {
    console.error("Error fetching language:", error);
    return NextResponse.error();
  }
}
