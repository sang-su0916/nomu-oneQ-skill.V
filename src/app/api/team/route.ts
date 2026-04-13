import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

const MAX_MEMBERS = 3;

// GET: 현재 사업장 멤버 목록
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":team", 30);
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

    // 현재 사업장 확인
    const { data: profile } = await admin
      .from("profiles")
      .select("current_company_id")
      .eq("id", user.id)
      .single();
    if (!profile?.current_company_id) {
      return NextResponse.json({ error: "사업장 없음" }, { status: 400 });
    }
    const companyId = profile.current_company_id;

    // 본인이 admin인지 확인
    const { data: myMembership } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .single();

    // 멤버 목록
    const { data: members } = await admin
      .from("company_members")
      .select("id, user_id, role, created_at")
      .eq("company_id", companyId)
      .order("created_at");

    // 각 멤버의 이메일 가져오기
    const { data: authData } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    const userMap = new Map(
      (authData?.users || []).map((u) => [u.id, u.email]),
    );

    const memberList = (members || []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      email: userMap.get(m.user_id) || "알 수 없음",
      role: m.role,
      isMe: m.user_id === user.id,
      createdAt: m.created_at,
    }));

    // 대기 중인 초대
    const { data: invites } = await admin
      .from("team_invites")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      members: memberList,
      invites: invites || [],
      myRole: myMembership?.role || "viewer",
      maxMembers: MAX_MEMBERS,
    });
  } catch (err) {
    console.error("[team GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: 멤버 초대
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":team-invite", 10);
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

    const { data: profile } = await admin
      .from("profiles")
      .select("current_company_id")
      .eq("id", user.id)
      .single();
    if (!profile?.current_company_id) {
      return NextResponse.json({ error: "사업장 없음" }, { status: 400 });
    }
    const companyId = profile.current_company_id;

    // admin 권한 확인
    const { data: myMembership } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .single();

    if (myMembership?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자만 초대할 수 있습니다." },
        { status: 403 },
      );
    }

    // 현재 멤버 수 확인
    const { count: memberCount } = await admin
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    const { count: pendingCount } = await admin
      .from("team_invites")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pending");

    if ((memberCount || 0) + (pendingCount || 0) >= MAX_MEMBERS) {
      return NextResponse.json(
        { error: `최대 ${MAX_MEMBERS}명까지 초대할 수 있습니다.` },
        { status: 400 },
      );
    }

    const { email, role } = await request.json();
    if (!email)
      return NextResponse.json(
        { error: "이메일을 입력해주세요." },
        { status: 400 },
      );

    const inviteRole = role === "manager" ? "manager" : "viewer";

    // 이미 멤버인지 확인
    const { data: authData } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    const targetUser = authData?.users?.find((u) => u.email === email);

    if (targetUser) {
      const { data: existing } = await admin
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", targetUser.id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "이미 등록된 멤버입니다." },
          { status: 400 },
        );
      }
    }

    // 중복 초대 확인
    const { data: existingInvite } = await admin
      .from("team_invites")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "이미 초대한 이메일입니다." },
        { status: 400 },
      );
    }

    // 초대 코드 생성
    const inviteCode = crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase();

    const { error: insertErr } = await admin.from("team_invites").insert({
      company_id: companyId,
      email,
      role: inviteRole,
      invite_code: inviteCode,
      invited_by: user.id,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일
    });

    if (insertErr) {
      console.error("[team POST] insert error:", insertErr);
      return NextResponse.json({ error: "초대 생성 실패" }, { status: 500 });
    }

    return NextResponse.json({ inviteCode });
  } catch (err) {
    console.error("[team POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// DELETE: 멤버 제거 또는 초대 취소
export async function DELETE(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":team-delete", 10);
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

    const { data: profile } = await admin
      .from("profiles")
      .select("current_company_id")
      .eq("id", user.id)
      .single();
    if (!profile?.current_company_id) {
      return NextResponse.json({ error: "사업장 없음" }, { status: 400 });
    }
    const companyId = profile.current_company_id;

    // admin 확인
    const { data: myMembership } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .single();

    if (myMembership?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자만 멤버를 관리할 수 있습니다." },
        { status: 403 },
      );
    }

    const { type, id } = await request.json();

    if (type === "member") {
      // 자기 자신은 삭제 불가
      const { data: target } = await admin
        .from("company_members")
        .select("user_id, role")
        .eq("id", id)
        .single();
      if (target?.user_id === user.id) {
        return NextResponse.json(
          { error: "본인은 제거할 수 없습니다." },
          { status: 400 },
        );
      }
      await admin
        .from("company_members")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);
    } else if (type === "invite") {
      await admin
        .from("team_invites")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[team DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
