import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { globalLimiter, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * GET /api/notifications — 알림 목록 조회
 * PATCH /api/notifications — 알림 읽음 처리
 */
export async function GET(request: NextRequest) {
  // 레이트 리미팅: 60회/분
  const ip = getClientIp(request);
  const rl = globalLimiter.check(ip + ":notifications", 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (!companyId)
    return NextResponse.json({ error: "company_id 필수" }, { status: 400 });

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[notifications GET] Database error:", error);
    return NextResponse.json(
      { error: "알림 조회 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }

  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(request: NextRequest) {
  // 레이트 리미팅: 60회/분
  const patchIp = getClientIp(request);
  const patchRl = globalLimiter.check(patchIp + ":notifications", 60);
  if (!patchRl.success) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: rateLimitHeaders(patchRl) },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다" },
      { status: 400 },
    );
  }
  const { notificationIds, markAllRead, companyId } = body;

  if (markAllRead && companyId) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("company_id", companyId)
      .eq("is_read", false);
    if (error) {
      console.error("[notifications PATCH markAllRead] Database error:", error);
      return NextResponse.json(
        { error: "알림 업데이트 중 오류가 발생했습니다" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  }

  if (notificationIds && Array.isArray(notificationIds)) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", notificationIds);
    if (error) {
      console.error("[notifications PATCH updateIds] Database error:", error);
      return NextResponse.json(
        { error: "알림 업데이트 중 오류가 발생했습니다" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "notificationIds 또는 markAllRead + companyId 필수" },
    { status: 400 },
  );
}
