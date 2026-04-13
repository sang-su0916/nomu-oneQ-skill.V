import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

const CONSULT_EMAIL =
  process.env.CONSULT_EMAIL || process.env.SMTP_USER || "sangsu0916@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 인증 확인
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "인증에 실패했습니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      category,
      description,
      urgency,
      contactPreference,
      contactInfo,
      companyName,
    } = body;

    if (!category || !description) {
      return NextResponse.json(
        { error: "상담 분류와 상황 설명은 필수입니다." },
        { status: 400 },
      );
    }

    const urgencyLabel =
      urgency === "emergency"
        ? "🔴 매우긴급"
        : urgency === "urgent"
          ? "🟡 긴급"
          : "🟢 일반";

    await sendEmail({
      to: CONSULT_EMAIL,
      subject: `[노무원큐 상담요청] ${urgencyLabel} ${category} - ${companyName || user.email}`,
      html: `
        <h2>노무사 상담 요청</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">분류</td><td style="padding:8px;border:1px solid #ddd;">${category}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">긴급도</td><td style="padding:8px;border:1px solid #ddd;">${urgencyLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">사업장</td><td style="padding:8px;border:1px solid #ddd;">${companyName || "-"}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">이메일</td><td style="padding:8px;border:1px solid #ddd;">${user.email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">연락 선호</td><td style="padding:8px;border:1px solid #ddd;">${contactPreference}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">연락처</td><td style="padding:8px;border:1px solid #ddd;">${contactInfo || "-"}</td></tr>
        </table>
        <h3>상황 설명</h3>
        <div style="padding:16px;background:#f9f9f9;border-radius:8px;white-space:pre-wrap;">${description}</div>
      `,
      text: `[노무원큐 상담요청]\n분류: ${category}\n긴급도: ${urgencyLabel}\n이메일: ${user.email}\n연락처: ${contactInfo}\n\n상황설명:\n${description}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "상담 요청 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
