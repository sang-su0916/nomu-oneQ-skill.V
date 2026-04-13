"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Company, CompanyMember, Profile } from "@/types/database";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  membership: CompanyMember | null;
  loading: boolean;
  isAdmin: boolean;
  // 회사 관련
  companies: Company[];
  switchCompany: (companyId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  // 인증
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [membership, setMembership] = useState<CompanyMember | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadUserData = useCallback(async (_currentUser: User) => {
    try {
      // 서버 API로 회사/프로필 데이터 로딩 (RLS 우회)
      const res = await fetch("/api/my-company");
      if (!res.ok) {
        console.error("사용자 데이터 로딩 실패:", res.status);
        setCompanies([]);
        setCompany(null);
        setMembership(null);
        setIsAdmin(false);
        return;
      }

      const data = await res.json();
      setProfile(data.profile || null);
      setIsAdmin(data.isAdmin || false);

      const companyList: Company[] = data.companies || [];
      const membershipList: CompanyMember[] = data.memberships || [];
      setCompanies(companyList);

      if (companyList.length > 0 && membershipList.length > 0) {
        const currentCompanyId =
          data.profile?.current_company_id || companyList[0]?.id;
        const currentCompany =
          companyList.find((c: Company) => c.id === currentCompanyId) ||
          companyList[0];
        const currentMembership =
          membershipList.find(
            (m: CompanyMember) => m.company_id === currentCompany?.id,
          ) || membershipList[0];

        setCompany(currentCompany || null);
        setMembership(currentMembership || null);
      } else {
        setCompany(null);
        setMembership(null);
      }
    } catch (err) {
      console.error("사용자 데이터 로딩 중 예외:", err);
      setCompanies([]);
      setCompany(null);
      setMembership(null);
      setIsAdmin(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    if (user) await loadUserData(user);
  }, [user, loadUserData]);

  const switchCompany = useCallback(
    async (companyId: string) => {
      if (!user) return;
      if (!companies.some((c) => c.id === companyId)) return;
      await supabase
        .from("profiles")
        .update({ current_company_id: companyId })
        .eq("id", user.id);
      await loadUserData(user);
    },
    [user, companies, supabase, loadUserData],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCompany(null);
    setMembership(null);
    setCompanies([]);
    setIsAdmin(false);
    // localStorage 잔여 데이터 정리
    if (typeof window !== "undefined") {
      localStorage.removeItem("nomu_company_info");
      localStorage.removeItem("nomu_employees");
      localStorage.removeItem("nomu_payment_records");
      localStorage.removeItem("nomu_contracts");
      localStorage.removeItem("nomu_migrated_to_supabase");
    }
  }, [supabase]);

  useEffect(() => {
    // 초기 세션 확인 (해시 토큰 우선 처리)
    const initAuth = async () => {
      // 홈페이지 자동 로그인: URL 해시의 access_token 감지 및 세션 설정
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          }
        }
      }

      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);
      if (u) await loadUserData(u);
      setLoading(false);
    };

    initAuth().catch(() => {
      setLoading(false);
    });

    // 세션 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await loadUserData(u);
      else {
        setProfile(null);
        setCompany(null);
        setMembership(null);
        setCompanies([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        membership,
        loading,
        isAdmin,
        companies,
        switchCompany,
        refreshAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
