export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// 密码从环境变量读取，默认 "mangaforge"
const SITE_PASSWORD = process.env.MANGAFORGE_PASSWORD || "mengmeng";

// POST /api/auth/login - 登录验证
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = body;

    if (password === SITE_PASSWORD) {
      const res = NextResponse.json({ success: true });
      res.cookies.set("mangaforge_auth", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30天
        path: "/",
      });
      return res;
    }

    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  } catch (error) {
    console.error("登录接口错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// POST /api/auth/logout - 退出登录（通过 fetch DELETE 调用）
export async function DELETE() {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.delete("mangaforge_auth");
    return res;
  } catch (error) {
    console.error("退出登录接口错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
