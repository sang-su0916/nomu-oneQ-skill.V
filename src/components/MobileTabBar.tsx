"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { docCategories } from "./Navigation";
import BottomSheet from "./BottomSheet";

const authTabs = [
  { href: "/dashboard", label: "홈", icon: "🏠" },
  { href: "/documents", label: "서류", icon: "📄", hasSheet: true },
  { href: "/archive", label: "보관함", icon: "🗄️" },
  { href: "/notifications", label: "알림", icon: "🔔" },
  { href: "/settings", label: "설정", icon: "⚙️" },
];

const guestTabs = [
  { href: "/documents", label: "서류", icon: "📄", hasSheet: true },
  { href: "/employees", label: "직원", icon: "👥" },
  { href: "/insurance", label: "도구", icon: "🧮" },
  { href: "/login", label: "로그인", icon: "🔑" },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showDocSheet, setShowDocSheet] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 로그인/회원가입/온보딩/랜딩에서는 숨김
  if (["/login", "/signup", "/onboarding", "/"].includes(pathname)) return null;

  const tabs = user ? authTabs : guestTabs;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/documents")
      return (
        pathname.startsWith("/documents") ||
        pathname.startsWith("/contract") ||
        pathname === "/payslip" ||
        pathname === "/wage-ledger" ||
        pathname === "/work-rules"
      );
    if (href === "/insurance")
      return (
        pathname === "/insurance" ||
        pathname === "/severance/calculate" ||
        pathname === "/shutdown-allowance" ||
        pathname === "/convert"
      );
    return pathname.startsWith(href);
  };

  const toggleCat = (title: string) => {
    setExpandedCat((prev) => (prev === title ? null : title));
  };

  // 검색 필터링
  const isSearching = search.trim().length > 0;
  const filteredCategories = isSearching
    ? docCategories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((item) =>
            item.label.toLowerCase().includes(search.trim().toLowerCase()),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : docCategories;

  const handleOpen = () => {
    setShowDocSheet(true);
    setSearch("");
    setExpandedCat(null);
  };

  return (
    <>
      <nav
        className="mobile-tab-bar no-print"
        role="tablist"
        aria-label="메인 내비게이션"
      >
        {tabs.map((tab) => (
          <button
            key={tab.href}
            role="tab"
            aria-selected={isActive(tab.href)}
            aria-label={tab.label}
            onClick={() => {
              if (tab.hasSheet) {
                handleOpen();
              } else {
                router.push(tab.href);
              }
            }}
            className={`mobile-tab-item ${isActive(tab.href) ? "mobile-tab-active" : ""}`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>

      <BottomSheet
        isOpen={showDocSheet}
        onClose={() => setShowDocSheet(false)}
        title="서류 선택"
      >
        {/* 검색창 */}
        <div className="sticky top-0 bg-[var(--bg-card)] pb-3 z-10">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="서류명으로 검색..."
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-[var(--text-light)]"
          />
        </div>

        <div className="space-y-1">
          {filteredCategories.length === 0 ? (
            <p className="text-center text-sm text-[var(--text-muted)] py-8">
              검색 결과가 없습니다
            </p>
          ) : isSearching ? (
            // 검색 중: 결과를 바로 펼쳐서 보여줌
            <div className="grid grid-cols-2 gap-2">
              {filteredCategories
                .flatMap((cat) => cat.items)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowDocSheet(false)}
                    className={`flex items-center px-3 py-2.5 rounded-xl border text-sm transition-colors touch-target ${
                      pathname === item.href
                        ? "border-[var(--primary)] bg-[rgba(30,58,95,0.05)] text-[var(--primary)] font-medium"
                        : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:border-[var(--primary)]"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
            </div>
          ) : (
            // 검색 안 할 때: 카테고리 아코디언
            filteredCategories.map((cat) => (
              <div key={cat.title}>
                <button
                  onClick={() => toggleCat(cat.title)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-[var(--bg)] transition-colors"
                >
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {cat.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {cat.items.length}종
                    </span>
                    <svg
                      className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expandedCat === cat.title ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
                {expandedCat === cat.title && (
                  <div className="grid grid-cols-2 gap-2 px-2 pb-3">
                    {cat.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowDocSheet(false)}
                        className={`flex items-center px-3 py-2.5 rounded-xl border text-sm transition-colors touch-target ${
                          pathname === item.href
                            ? "border-[var(--primary)] bg-[rgba(30,58,95,0.05)] text-[var(--primary)] font-medium"
                            : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:border-[var(--primary)]"
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </BottomSheet>
    </>
  );
}
