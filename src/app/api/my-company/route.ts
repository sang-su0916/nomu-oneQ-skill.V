import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // 레이트 리미팅: 60회/분
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":my-company", 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
    // 1. 현재 로그인한 유저 확인
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await serverSupabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 2. Service Role 클라이언트 (RLS 우회)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 3. 프로필
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // 4. 멤버십 + 사업장
    const { data: memberships } = await adminSupabase
      .from("company_members")
      .select("*")
      .eq("user_id", user.id);

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const isAdmin = adminEmails.includes(user.email || "");

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        profile,
        companies: [],
        memberships: [],
        isAdmin,
      });
    }

    const companyIds = memberships.map((m) => m.company_id);
    const { data: companies } = await adminSupabase
      .from("companies")
      .select("*")
      .in("id", companyIds);

    return NextResponse.json({
      profile,
      companies: companies || [],
      memberships,
      isAdmin,
    });
  } catch (err) {
    console.error("[my-company] 예외:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
