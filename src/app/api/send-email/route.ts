import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/send-email
 * 이메일 발송 API
 * 인증: Supabase 로그인 세션 또는 SUPABASE_SERVICE_ROLE_KEY
 */
export async function POST(request: NextRequest) {
  // 레이트 리미팅: 5회/분 (스팸 방지)
  const ip = getClientIp(request);
  const rl = globalLimiter.check(ip + ":send-email", 5);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  // 인증 확인: 1) Supabase 세션 2) service_role key
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isServiceRole = serviceKey && authHeader === `Bearer ${serviceKey}`;

  if (!isServiceRole) {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await serverSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "인증 실패" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const { to, subject, html, text, attachments } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "to, subject, html 필수" },
        { status: 400 },
      );
    }

    const result = await sendEmail({ to, subject, html, text, attachments });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        fallback: result.fallback || false,
      });
    }

    console.error("[send-email] 발송 실패:", result.error);
    return NextResponse.json(
      { error: `이메일 발송 실패: ${result.error || "알 수 없는 오류"}` },
      { status: 500 },
    );
  } catch (err) {
    console.error("[send-email]", err);
    return NextResponse.json(
      { error: "이메일 발송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
