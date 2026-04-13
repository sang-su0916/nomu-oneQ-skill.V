import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // 레이트 리미팅: 30회/분
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":encrypt-resident", 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const { value } = await request.json();

    if (!value || typeof value !== "string") {
      return NextResponse.json(
        { error: "주민등록번호를 입력해주세요." },
        { status: 400 },
      );
    }

    const encrypted = encrypt(value);

    return NextResponse.json({ encrypted });
  } catch (error) {
    console.error("암호화 실패:", error);
    return NextResponse.json(
      { error: "암호화 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
