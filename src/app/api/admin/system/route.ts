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
    const rl = globalLimiter.check(ip + ":admin-system", 30);
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

    // 테이블별 레코드 수
    const tableNames = [
      "profiles",
      "companies",
      "company_members",
      "employees",
      "documents",
      "license_codes",
    ];
    const tables = await Promise.all(
      tableNames.map(async (name) => {
        const { count } = await admin
          .from(name)
          .select("id", { count: "exact", head: true });
        return { name, count: count || 0 };
      }),
    );

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || "";

    return NextResponse.json({
      supabase: {
        url: supabaseUrl,
        region: "ap-northeast-2 (서울)",
        projectId,
      },
      vercel: {
        url: "https://nomu-oneq.vercel.app",
        env: process.env.NODE_ENV || "production",
      },
      tables,
      buildInfo: {
        nextVersion: "16.1.6",
        nodeEnv: process.env.NODE_ENV || "unknown",
        timestamp: new Date().toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        }),
      },
    });
  } catch (err) {
    console.error("[admin/system]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
