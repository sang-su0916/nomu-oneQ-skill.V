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
    const rl = globalLimiter.check(ip + ":admin-companies", 30);
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

    const search = request.nextUrl.searchParams.get("search") || "";

    const { data: companies } = await admin.from("companies").select("*");
    const { data: members } = await admin
      .from("company_members")
      .select("company_id, user_id");
    const { data: employees } = await admin
      .from("employees")
      .select("company_id, status");
    const { data: documents } = await admin
      .from("documents")
      .select("company_id");

    const companyList = (companies || [])
      .map((c) => {
        const memberCount = (members || []).filter(
          (m) => m.company_id === c.id,
        ).length;
        const empAll = (employees || []).filter((e) => e.company_id === c.id);
        const activeEmps = empAll.filter((e) => e.status === "active").length;
        const docCount = (documents || []).filter(
          (d) => d.company_id === c.id,
        ).length;

        return {
          id: c.id,
          name: c.name,
          ceoName: c.ceo_name,
          businessNumber: c.business_number,
          plan: c.plan,
          planExpiresAt: c.plan_expires_at,
          memberCount,
          employeeCount: activeEmps,
          totalEmployees: empAll.length,
          documentCount: docCount,
          createdAt: c.created_at,
        };
      })
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.ceoName || "").toLowerCase().includes(q) ||
          (c.businessNumber || "").includes(q)
        );
      });

    return NextResponse.json({ companies: companyList });
  } catch (err) {
    console.error("[admin/companies]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 레이트 리미팅: 30회/분
    const patchIp = getClientIp(request);
    const patchRl = globalLimiter.check(patchIp + ":admin-companies", 30);
    if (!patchRl.success) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(patchRl) },
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

    const { companyId, plan, planExpiresAt } = await request.json();

    const updates: Record<string, string | null> = {};
    if (plan) updates.plan = plan;
    if (planExpiresAt !== undefined) updates.plan_expires_at = planExpiresAt;

    const { error } = await admin
      .from("companies")
      .update(updates)
      .eq("id", companyId);
    if (error) {
      console.error("[admin/companies PATCH] Database error:", error);
      return NextResponse.json(
        { error: "회사 정보 업데이트 중 오류가 발생했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/companies PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
