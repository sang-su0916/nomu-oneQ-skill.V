"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { user } = useAuth();

  // 게스트 사용자: "홈" 링크를 /documents로 변경 (dashboard 접근 불가하므로)
  const resolvedItems = items.map((item) => {
    if (item.label === "홈" && item.href === "/dashboard" && !user) {
      return { ...item, href: "/documents" };
    }
    return item;
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-6 flex-wrap">
      {resolvedItems.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[var(--text-light)]">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-[var(--primary)] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--text)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
