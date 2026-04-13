import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 29000,
  pro: 59000,
  enterprise: 99000,
};

export async function GET(request: NextRequest) {
  try {
    // 레이트 리미팅: 30회/분
    const ip = getClientIp(request);
    const rl = globalLimiter.check(ip + ":admin-revenue", 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: companies } = await admin
      .from("companies")
      .select("id, name, plan, plan_expires_at, created_at");

    const all = companies || [];

    // MRR 계산
    const mrr = all.reduce((sum, c) => sum + (PLAN_PRICES[c.plan] || 0), 0);

    // 플랜별 구독자
    const planStats = Object.entries(PLAN_PRICES).map(([plan, price]) => {
      const count = all.filter((c) => c.plan === plan).length;
      return { plan, price, count, revenue: count * price };
    });

    // 만료 예정 (30일 내)
    const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString();
    const expiringSoon = all
      .filter(
        (c) =>
          c.plan_expires_at &&
          c.plan_expires_at <= thirtyDaysLater &&
          c.plan !== "start",
      )
      .map((c) => ({
        id: c.id,
        name: c.name,
        plan: c.plan,
        expiresAt: c.plan_expires_at,
      }));

    // 월별 가입 추이 (최근 6개월)
    const monthlySignups: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = all.filter((c) => c.created_at?.startsWith(month)).length;
      monthlySignups.push({ month, count });
    }

    return NextResponse.json({ mrr, planStats, expiringSoon, monthlySignups });
  } catch (err) {
    console.error("[admin/revenue]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
