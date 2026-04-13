import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":team-accept", 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { inviteCode } = await request.json();
    if (!inviteCode)
      return NextResponse.json(
        { error: "초대 코드를 입력해주세요." },
        { status: 400 },
      );

    // 초대 조회
    const { data: invite } = await admin
      .from("team_invites")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .eq("status", "pending")
      .single();

    if (!invite) {
      return NextResponse.json(
        { error: "유효하지 않거나 만료된 초대 코드입니다." },
        { status: 400 },
      );
    }

    // 만료 확인
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await admin
        .from("team_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      return NextResponse.json(
        { error: "만료된 초대 코드입니다." },
        { status: 400 },
      );
    }

    // 이메일 일치 확인
    if (invite.email !== user.email) {
      return NextResponse.json(
        { error: "초대받은 이메일과 로그인 이메일이 다릅니다." },
        { status: 403 },
      );
    }

    // 이미 멤버인지 확인
    const { data: existing } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", invite.company_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await admin
        .from("team_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);
      return NextResponse.json(
        { error: "이미 이 사업장의 멤버입니다." },
        { status: 400 },
      );
    }

    // 멤버 등록
    const { error: memberErr } = await admin.from("company_members").insert({
      company_id: invite.company_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by,
    });

    if (memberErr) {
      console.error("[team/accept] member insert error:", memberErr);
      return NextResponse.json({ error: "멤버 등록 실패" }, { status: 500 });
    }

    // 초대 상태 업데이트
    await admin
      .from("team_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    // 프로필에 현재 사업장 설정
    await admin
      .from("profiles")
      .update({ current_company_id: invite.company_id })
      .eq("id", user.id);

    // 사업장명 조회
    const { data: company } = await admin
      .from("companies")
      .select("name")
      .eq("id", invite.company_id)
      .single();

    return NextResponse.json({
      success: true,
      companyName: company?.name || "사업장",
      role: invite.role,
    });
  } catch (err) {
    console.error("[team/accept]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
