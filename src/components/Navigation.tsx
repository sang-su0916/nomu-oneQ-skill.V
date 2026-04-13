"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// 서류 카테고리 (데스크톱 드롭다운 + 모바일 메뉴 공유)
const docCategories = [
  {
    title: "계약서",
    items: [
      { href: "/contract/fulltime", label: "정규직 근로계약서" },
      { href: "/contract/parttime", label: "파트타임 계약서" },
      { href: "/contract/freelancer", label: "프리랜서 계약서" },
      { href: "/contract/foreign", label: "외국인 근로계약서" },
    ],
  },
  {
    title: "증명서",
    items: [
      { href: "/documents/certificate", label: "재직증명서" },
      { href: "/documents/career-certificate", label: "경력증명서" },
    ],
  },
  {
    title: "급여/임금",
    items: [
      { href: "/payslip", label: "급여명세서" },
      { href: "/wage-ledger", label: "임금대장" },
      { href: "/documents/retirement-pay", label: "퇴직금정산서" },
    ],
  },
  {
    title: "근태/휴가",
    items: [
      { href: "/documents/attendance", label: "출퇴근기록부" },
      { href: "/documents/overtime", label: "시간외근로합의서" },
      { href: "/documents/annual-leave", label: "연차관리대장" },
      { href: "/documents/annual-leave-notice", label: "연차촉진통보서" },
    ],
  },
  {
    title: "동의/서약",
    items: [
      { href: "/documents/privacy-consent", label: "개인정보동의서" },
      { href: "/documents/nda", label: "비밀유지서약서" },
      { href: "/documents/pledge", label: "서약서" },
    ],
  },
  {
    title: "인사관리",
    items: [
      { href: "/documents/personnel-card", label: "인사카드" },
      { href: "/documents/probation-eval", label: "수습평가서" },
      { href: "/documents/training-record", label: "교육훈련확인서" },
      { href: "/documents/resignation", label: "사직서" },
      { href: "/documents/handover", label: "업무인수인계서" },
    ],
  },
  {
    title: "징계/해고",
    items: [
      { href: "/documents/warning-letter", label: "경고장" },
      { href: "/documents/disciplinary-notice", label: "징계통보서" },
      { href: "/documents/termination-notice", label: "해고통보서" },
    ],
  },
  {
    title: "업무/기타",
    items: [
      { href: "/documents/leave-application", label: "휴직신청서" },
      { href: "/documents/reinstatement", label: "복직신청서" },
      { href: "/documents/work-hours-change", label: "근무시간변경합의서" },
      { href: "/documents/remote-work", label: "재택근무신청서" },
      { href: "/documents/business-trip", label: "출장신청서" },
      { href: "/documents/side-job-permit", label: "겸업허가신청서" },
      { href: "/work-rules", label: "취업규칙" },
    ],
  },
  {
    title: "퇴직/전환",
    items: [
      { href: "/terminate", label: "퇴직 처리 가이드" },
      { href: "/documents/settlement", label: "퇴직 통합 정산서" },
      { href: "/documents/separation-agreement", label: "권고사직 합의서" },
      { href: "/guide/insurance-loss", label: "4대보험 상실 안내" },
      { href: "/consult", label: "노무사 상담" },
    ],
  },
];

// 도구/계산기 메뉴
const toolItems = [
  {
    href: "/insurance",
    label: "4대보험 계산기",
    icon: "🏥",
    desc: "근로자·사업주 보험료 계산",
  },
  {
    href: "/severance/calculate",
    label: "퇴직금 계산기",
    icon: "💼",
    desc: "평균임금·통상임금 비교",
  },
  {
    href: "/shutdown-allowance",
    label: "휴업수당 계산기",
    icon: "🏭",
    desc: "전일 휴업·단축 근무",
  },
  {
    href: "/convert",
    label: "근로형태 전환",
    icon: "🔄",
    desc: "정규직↔파트타임 비교 분석",
  },
];

// 메인 메뉴
const menuItems = [
  { href: "/dashboard", label: "대시보드", icon: "📊" },
  { href: "/employees", label: "직원", icon: "👥" },
  { href: "/documents", label: "서류", icon: "📄", hasSubmenu: true },
  { href: "/tools", label: "도구", icon: "🧮", hasToolMenu: true },
  { href: "/archive", label: "보관함", icon: "🗄️" },
  { href: "/notifications", label: "알림", icon: "🔔" },
];

export { docCategories };

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, company, companies, switchCompany, signOut, loading, isAdmin } =
    useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCompanySelect, setShowCompanySelect] = useState(false);
  const [mobileDocOpen, setMobileDocOpen] = useState(false);
  const [openToolMenu, setOpenToolMenu] = useState(false);
  const [mobileToolOpen, setMobileToolOpen] = useState(false);
  const [docSearch, setDocSearch] = useState("");

  // 검색 필터링된 카테고리
  const filteredCategories = docSearch.trim()
    ? docCategories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((item) =>
            item.label.toLowerCase().includes(docSearch.trim().toLowerCase()),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : docCategories;

  // 로그인/회원가입 페이지, 랜딩 페이지에서는 네비 숨김
  if (
    [
      "/login",
      "/signup",
      "/onboarding",
      "/forgot-password",
      "/reset-password",
    ].includes(pathname)
  )
    return null;

  const isAdminPage = pathname.startsWith("/admin");

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/documents") {
      return (
        pathname.startsWith("/documents") ||
        pathname.startsWith("/contract") ||
        pathname === "/payslip" ||
        pathname === "/wage-ledger" ||
        pathname === "/work-rules"
      );
    }
    if (href === "/tools") {
      return (
        pathname === "/insurance" ||
        pathname === "/severance/calculate" ||
        pathname === "/shutdown-allowance" ||
        pathname === "/convert"
      );
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <nav className="nav-container no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href={user ? "/dashboard" : "/"}
            className="flex items-center gap-2.5"
          >
            <div className="relative w-7 h-7">
              <Image
                src="/logo.png"
                alt="노무원큐"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-semibold text-[var(--text)]">노무원큐</span>
          </Link>

          {user && company && (
            <>
              {/* 사업장 선택 (다중 사업장) */}
              {companies.length > 1 && (
                <div className="hidden md:block relative ml-4">
                  <button
                    onClick={() => setShowCompanySelect(!showCompanySelect)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--bg)] rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                  >
                    <span className="font-medium text-[var(--text)]">
                      {company.name}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-[var(--text-muted)]"
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
                  </button>
                  {showCompanySelect && (
                    <div className="absolute top-full left-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg py-1 min-w-[200px] shadow-lg z-50">
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            switchCompany(c.id);
                            setShowCompanySelect(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${c.id === company.id ? "text-[var(--primary)] bg-[rgba(30,58,95,0.05)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
                {isAdminPage && isAdmin ? (
                  <>
                    <Link
                      href="/admin"
                      className={`nav-link ${pathname === "/admin" ? "nav-link-active" : ""}`}
                    >
                      <span>🛡️</span>
                      <span>대시보드</span>
                    </Link>
                    <Link
                      href="/admin/users"
                      className={`nav-link ${pathname === "/admin/users" ? "nav-link-active" : ""}`}
                    >
                      <span>👤</span>
                      <span>사용자</span>
                    </Link>
                    <Link
                      href="/admin/companies"
                      className={`nav-link ${pathname === "/admin/companies" ? "nav-link-active" : ""}`}
                    >
                      <span>🏢</span>
                      <span>사업장</span>
                    </Link>
                    <Link
                      href="/admin/revenue"
                      className={`nav-link ${pathname === "/admin/revenue" ? "nav-link-active" : ""}`}
                    >
                      <span>💳</span>
                      <span>매출</span>
                    </Link>
                    <Link
                      href="/admin/analytics"
                      className={`nav-link ${pathname === "/admin/analytics" ? "nav-link-active" : ""}`}
                    >
                      <span>📊</span>
                      <span>분석</span>
                    </Link>
                    <Link
                      href="/admin/system"
                      className={`nav-link ${pathname === "/admin/system" ? "nav-link-active" : ""}`}
                    >
                      <span>⚙️</span>
                      <span>시스템</span>
                    </Link>
                    <Link href="/dashboard" className="nav-link">
                      <span>🏠</span>
                      <span>사용자화면</span>
                    </Link>
                  </>
                ) : (
                  <>
                    {menuItems.map((item) => (
                      <div key={item.href} className="relative">
                        {item.hasSubmenu ? (
                          <div
                            onMouseEnter={() => {
                              setOpenSubmenu(true);
                              setDocSearch("");
                            }}
                            onMouseLeave={() => {
                              setOpenSubmenu(false);
                              setDocSearch("");
                            }}
                          >
                            <button
                              className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
                              aria-expanded={openSubmenu}
                              aria-haspopup="true"
                              onClick={() => {
                                setOpenSubmenu(!openSubmenu);
                                setDocSearch("");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setOpenSubmenu(!openSubmenu);
                                  setDocSearch("");
                                }
                                if (e.key === "Escape") setOpenSubmenu(false);
                              }}
                            >
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                              <svg
                                className="w-3 h-3 ml-0.5"
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
                            </button>
                            {openSubmenu && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50">
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-3 px-2 shadow-xl animate-fade-in w-[min(520px,90vw)]">
                                  {/* 검색창 */}
                                  <div className="px-2 mb-3">
                                    <input
                                      type="text"
                                      value={docSearch}
                                      onChange={(e) =>
                                        setDocSearch(e.target.value)
                                      }
                                      placeholder="서류명 검색..."
                                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-[var(--text-light)]"
                                      autoFocus
                                    />
                                  </div>
                                  {filteredCategories.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                                      {filteredCategories.map((cat) => (
                                        <div key={cat.title} className="mb-2">
                                          <p className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                            {cat.title}
                                          </p>
                                          {cat.items.map((sub) => (
                                            <Link
                                              key={sub.href}
                                              href={sub.href}
                                              className={`block px-2 py-1.5 text-xs rounded-md transition-colors ${pathname === sub.href ? "text-[var(--primary)] bg-[rgba(30,58,95,0.06)] font-medium" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"}`}
                                            >
                                              {sub.label}
                                            </Link>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-center text-sm text-[var(--text-muted)] py-4">
                                      검색 결과가 없습니다
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : item.hasToolMenu ? (
                          <div
                            onMouseEnter={() => setOpenToolMenu(true)}
                            onMouseLeave={() => setOpenToolMenu(false)}
                          >
                            <button
                              className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
                              onClick={() => setOpenToolMenu(!openToolMenu)}
                            >
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                              <svg
                                className="w-3 h-3 ml-0.5"
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
                            </button>
                            {openToolMenu && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50">
                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-2 px-2 shadow-xl animate-fade-in w-[280px]">
                                  {toolItems.map((tool) => (
                                    <Link
                                      key={tool.href}
                                      href={tool.href}
                                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                        pathname === tool.href
                                          ? "text-[var(--primary)] bg-[rgba(30,58,95,0.06)] font-medium"
                                          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                                      }`}
                                    >
                                      <span className="text-lg">
                                        {tool.icon}
                                      </span>
                                      <div>
                                        <p className="text-sm font-medium">
                                          {tool.label}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                          {tool.desc}
                                        </p>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={item.href}
                            className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
                          >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* User Menu */}
              <div className="hidden md:block relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors"
                >
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
                      {user.email?.[0]?.toUpperCase() || "?"}
                    </div>
                    {isAdmin && (
                      <div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"
                        title="관리자"
                      />
                    )}
                  </div>
                  <svg
                    className="w-3.5 h-3.5 text-[var(--text-muted)]"
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
                </button>
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg py-1 min-w-[180px] shadow-lg z-50">
                    <div className="px-4 py-2 text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                      {user.email}
                      {isAdmin && (
                        <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        🛡️ 관리자 대시보드
                      </Link>
                    )}
                    <Link
                      href="/guide"
                      className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg)]"
                      onClick={() => setShowUserMenu(false)}
                    >
                      📖 사용 가이드
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg)]"
                      onClick={() => setShowUserMenu(false)}
                    >
                      ⚙️ 설정
                    </Link>
                    <Link
                      href="/membership"
                      className="block px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg)]"
                      onClick={() => setShowUserMenu(false)}
                    >
                      💎 멤버십
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--bg)]"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && !loading && (
            <>
              {/* Guest Desktop Menu */}
              <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
                <Link
                  href="/documents"
                  className={`nav-link ${isActive("/documents") ? "nav-link-active" : ""}`}
                >
                  <span>📄</span>
                  <span>서류</span>
                </Link>
                <Link
                  href="/employees"
                  className={`nav-link ${pathname === "/employees" ? "nav-link-active" : ""}`}
                >
                  <span>👥</span>
                  <span>직원</span>
                </Link>
                {/* 서류 드롭다운 */}
                <div
                  onMouseEnter={() => {
                    setOpenSubmenu(true);
                    setDocSearch("");
                  }}
                  onMouseLeave={() => {
                    setOpenSubmenu(false);
                    setDocSearch("");
                  }}
                  className="relative"
                >
                  <button
                    className={`nav-link ${pathname.startsWith("/contract") || pathname === "/payslip" || pathname === "/wage-ledger" ? "nav-link-active" : ""}`}
                    onClick={() => {
                      setOpenSubmenu(!openSubmenu);
                      setDocSearch("");
                    }}
                  >
                    <span>📝</span>
                    <span>작성</span>
                    <svg
                      className="w-3 h-3 ml-0.5"
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
                  </button>
                  {openSubmenu && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50">
                      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-3 px-2 shadow-xl animate-fade-in w-[min(520px,90vw)]">
                        <div className="px-2 mb-3">
                          <input
                            type="text"
                            value={docSearch}
                            onChange={(e) => setDocSearch(e.target.value)}
                            placeholder="서류명 검색..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-[var(--text-light)]"
                            autoFocus
                          />
                        </div>
                        {filteredCategories.length > 0 ? (
                          <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                            {filteredCategories.map((cat) => (
                              <div key={cat.title} className="mb-2">
                                <p className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                  {cat.title}
                                </p>
                                {cat.items.map((sub) => (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    className={`block px-2 py-1.5 text-xs rounded-md transition-colors ${pathname === sub.href ? "text-[var(--primary)] bg-[rgba(30,58,95,0.06)] font-medium" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"}`}
                                  >
                                    {sub.label}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-sm text-[var(--text-muted)] py-4">
                            검색 결과가 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* 도구 드롭다운 */}
                <div
                  onMouseEnter={() => setOpenToolMenu(true)}
                  onMouseLeave={() => setOpenToolMenu(false)}
                  className="relative"
                >
                  <button
                    className={`nav-link ${isActive("/tools") ? "nav-link-active" : ""}`}
                    onClick={() => setOpenToolMenu(!openToolMenu)}
                  >
                    <span>🧮</span>
                    <span>도구</span>
                    <svg
                      className="w-3 h-3 ml-0.5"
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
                  </button>
                  {openToolMenu && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50">
                      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-2 px-2 shadow-xl animate-fade-in w-[280px]">
                        {toolItems.map((tool) => (
                          <Link
                            key={tool.href}
                            href={tool.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                              pathname === tool.href
                                ? "text-[var(--primary)] bg-[rgba(30,58,95,0.06)] font-medium"
                                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                            }`}
                          >
                            <span className="text-lg">{tool.icon}</span>
                            <div>
                              <p className="text-sm font-medium">
                                {tool.label}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {tool.desc}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <a
                  href="https://lbiz-partners.com/members"
                  className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90"
                >
                  홈페이지로 이동
                </a>
              </div>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-[var(--bg)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)] animate-fade-in">
            {user && company ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
                  🏢 {company.name}
                </div>

                {/* 주요 메뉴 */}
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${pathname === "/dashboard" ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>📊</span>
                  <span>대시보드</span>
                </Link>
                <Link
                  href="/employees"
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${pathname === "/employees" ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>👥</span>
                  <span>직원관리</span>
                </Link>

                {/* 서류 (접기/펼치기) */}
                <button
                  onClick={() => setMobileDocOpen(!mobileDocOpen)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-md ${
                    isActive("/documents")
                      ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>📄</span>
                    <span>서류</span>
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${mobileDocOpen ? "rotate-180" : ""}`}
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
                </button>
                {mobileDocOpen && (
                  <div className="ml-4 space-y-3 py-2">
                    <div className="px-3">
                      <input
                        type="text"
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        placeholder="서류명 검색..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-[var(--text-light)]"
                      />
                    </div>
                    {filteredCategories.map((cat) => (
                      <div key={cat.title}>
                        <p className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                          {cat.title}
                        </p>
                        {cat.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block px-3 py-1.5 text-sm rounded-md ${pathname === item.href ? "text-[var(--primary)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* 도구 (접기/펼치기) */}
                <button
                  onClick={() => setMobileToolOpen(!mobileToolOpen)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-md ${
                    isActive("/tools")
                      ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🧮</span>
                    <span>도구</span>
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${mobileToolOpen ? "rotate-180" : ""}`}
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
                </button>
                {mobileToolOpen && (
                  <div className="ml-4 space-y-1 py-1">
                    {toolItems.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md ${pathname === tool.href ? "text-[var(--primary)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span>{tool.icon}</span>
                        <span>{tool.label}</span>
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href="/archive"
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${pathname === "/archive" ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>🗄️</span>
                  <span>보관함</span>
                </Link>
                <Link
                  href="/notifications"
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${pathname === "/notifications" ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>🔔</span>
                  <span>알림</span>
                </Link>
                <Link
                  href="/guide"
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${pathname === "/guide" ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>📖</span>
                  <span>가이드</span>
                </Link>
                <Link
                  href="/settings"
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${pathname === "/settings" ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>⚙️</span>
                  <span>설정</span>
                </Link>

                <div className="border-t border-[var(--border)] mt-2 pt-2">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 font-medium rounded-md hover:bg-red-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      🛡️ 관리자 대시보드
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-500 rounded-md hover:bg-[var(--bg)]"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 px-3">
                <div className="flex gap-2 mb-3">
                  <a
                    href="https://lbiz-partners.com/members"
                    className="flex-1 text-center py-2.5 text-sm bg-[var(--primary)] text-white font-medium rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    홈페이지로 이동
                  </a>
                </div>
                <p className="text-xs text-[var(--text-light)] mb-2">
                  홈페이지 회원 전용 서비스
                </p>
                {[
                  { href: "/documents", icon: "📄", label: "노무서류 전체" },
                  { href: "/employees", icon: "👥", label: "직원관리" },
                  { href: "/payslip", icon: "💵", label: "급여명세서" },
                  {
                    href: "/contract/fulltime",
                    icon: "📋",
                    label: "정규직 계약서",
                  },
                  {
                    href: "/contract/parttime",
                    icon: "📋",
                    label: "파트타임 계약서",
                  },
                  {
                    href: "/severance/calculate",
                    icon: "💼",
                    label: "퇴직금 계산기",
                  },
                  { href: "/insurance", icon: "🏥", label: "4대보험 계산기" },
                  { href: "/convert", icon: "🔄", label: "근로형태 전환" },
                  { href: "/work-rules", icon: "📖", label: "취업규칙" },
                  { href: "/guide", icon: "📖", label: "사용 가이드" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${pathname === item.href ? "text-[var(--primary)] bg-[rgba(30,58,95,0.08)] font-medium" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
