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
    const rl = globalLimiter.check(ip + ":admin-analytics", 30);
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

    // 서류 종류별 통계
    const { data: documents } = await admin
      .from("documents")
      .select("type, created_at");
    const docTypeCounts: Record<string, number> = {};
    (documents || []).forEach((d) => {
      docTypeCounts[d.type] = (docTypeCounts[d.type] || 0) + 1;
    });
    const topDocuments = Object.entries(docTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 사업장 규모별 분포
    const { data: employees } = await admin
      .from("employees")
      .select("company_id, status");
    const companyEmpCounts: Record<string, number> = {};
    (employees || [])
      .filter((e) => e.status === "active")
      .forEach((e) => {
        companyEmpCounts[e.company_id] =
          (companyEmpCounts[e.company_id] || 0) + 1;
      });
    const sizeDistribution = { under5: 0, "5to10": 0, "10to30": 0, over30: 0 };
    Object.values(companyEmpCounts).forEach((count) => {
      if (count < 5) sizeDistribution.under5++;
      else if (count <= 10) sizeDistribution["5to10"]++;
      else if (count <= 30) sizeDistribution["10to30"]++;
      else sizeDistribution.over30++;
    });

    // 일별 서류 생성 추이 (최근 30일)
    const dailyDocs: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const date = d.toISOString().split("T")[0];
      const count = (documents || []).filter((doc) =>
        doc.created_at?.startsWith(date),
      ).length;
      dailyDocs.push({ date, count });
    }

    // 일별 활성 사용자 (Auth 기반)
    const { data: authData } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    const users = authData?.users || [];

    const weeklyActive: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dayStart = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();
      const dayEnd = dayStart + 86400000;
      const count = users.filter((u) => {
        const t = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
        return t >= dayStart && t < dayEnd;
      }).length;
      weeklyActive.push({ date: d.toISOString().split("T")[0], count });
    }

    return NextResponse.json({
      topDocuments,
      sizeDistribution,
      dailyDocs,
      weeklyActive,
      totalDocuments: documents?.length || 0,
      totalEmployees: employees?.length || 0,
    });
  } catch (err) {
    console.error("[admin/analytics]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
