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
    const rl = globalLimiter.check(ip + ":admin-users", 30);
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

    // Auth 사용자 목록
    const { data: authData } = await admin.auth.admin.listUsers({
      perPage: 500,
    });
    const authUsers = authData?.users || [];

    // 프로필 + 멤버십
    const { data: profiles } = await admin.from("profiles").select("*");
    const { data: members } = await admin
      .from("company_members")
      .select("*, companies(name, plan)");

    const userList = authUsers
      .map((au) => {
        const profile = (profiles || []).find((p) => p.id === au.id);
        const membership = (members || []).find((m) => m.user_id === au.id);
        const company = membership?.companies as {
          name: string;
          plan: string;
        } | null;

        return {
          id: au.id,
          email: au.email || "",
          provider: au.app_metadata?.provider || "email",
          createdAt: au.created_at,
          lastSignIn: au.last_sign_in_at,
          companyName: company?.name || null,
          plan: company?.plan || null,
          role: membership?.role || null,
          banned: au.banned_until ? true : false,
        };
      })
      .filter((u) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          u.email.toLowerCase().includes(q) ||
          (u.companyName || "").toLowerCase().includes(q)
        );
      });

    return NextResponse.json({ users: userList });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 레이트 리미팅: 30회/분
    const patchIp = getClientIp(request);
    const patchRl = globalLimiter.check(patchIp + ":admin-users", 30);
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

    const { userId, action } = await request.json();

    if (action === "ban") {
      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      }); // 100년
    } else if (action === "unban") {
      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
