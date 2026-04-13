import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export async function GET(request: NextRequest) {
  try {
    // 레이트 리미팅: 30회/분
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":admin-stats", 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();
    if (authError) {
      console.error("[admin/stats] auth error:", authError.message);
      return NextResponse.json(
        { error: "인증 실패: " + authError.message },
        { status: 401 },
      );
    }
    if (!user)
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    // 관리자 확인
    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 전체 사용자 수
    const { count: totalUsers } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // 오늘 가입
    const today = new Date().toISOString().split("T")[0];
    const { count: todayUsers } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today);

    // 이번 주 가입
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: weekUsers } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    // 사업장 수 (플랜별)
    const { data: companies } = await admin
      .from("companies")
      .select("id, plan");

    const planCounts = { start: 0, pro: 0, ultra: 0 };
    (companies || []).forEach((c: { plan: string }) => {
      if (c.plan in planCounts) planCounts[c.plan as keyof typeof planCounts]++;
    });

    // 7일 내 로그인 (활성 사용률)
    const { data: authUsers } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const activeUsers = (authUsers?.users || []).filter((u) => {
      const lastSignIn = u.last_sign_in_at
        ? new Date(u.last_sign_in_at).getTime()
        : 0;
      return lastSignIn > sevenDaysAgo;
    }).length;

    const totalAuthUsers = authUsers?.users?.length || 1;
    const activeRate = Math.round((activeUsers / totalAuthUsers) * 100);

    // 유료 전환율
    const totalCompanies = companies?.length || 0;
    const paidCompanies = totalCompanies - planCounts.start;
    const conversionRate =
      totalCompanies > 0
        ? Math.round((paidCompanies / totalCompanies) * 100)
        : 0;

    // 전체 직원 수
    const { count: totalEmployees } = await admin
      .from("employees")
      .select("id", { count: "exact", head: true });

    // 전체 서류 수
    const { count: totalDocuments } = await admin
      .from("documents")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({
      users: {
        total: totalUsers || 0,
        today: todayUsers || 0,
        week: weekUsers || 0,
      },
      companies: { total: totalCompanies, plans: planCounts },
      activeRate,
      conversionRate,
      employees: totalEmployees || 0,
      documents: totalDocuments || 0,
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
