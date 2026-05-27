import { NextResponse } from "next/server";

// 密码从环境变量读取，默认 "mangaforge"
const SITE_PASSWORD = process.env.MANGAFORGE_PASSWORD || "mengmeng";

// POST /api/auth/login - 登录验证
export async function POST(req: Request) {
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
}

// POST 或 DELETE /api/auth/logout - 退出登录
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("mangaforge_auth");
  return res;
}
