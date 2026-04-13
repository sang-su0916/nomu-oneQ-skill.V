"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CompanyInfo } from "@/types";

export const defaultCompanyInfo: CompanyInfo = {
  name: "",
  ceoName: "",
  businessNumber: "",
  address: "",
  phone: "",
};

const GUEST_KEY = "nomu_guest_company";

export function useCompanyInfo(): {
  companyInfo: CompanyInfo;
  loading: boolean;
  setGuestCompany: (info: CompanyInfo) => void;
  isGuest: boolean;
} {
  const { user, company, loading } = useAuth();
  const [guestCompany, setGuestCompanyState] =
    useState<CompanyInfo>(defaultCompanyInfo);

  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem(GUEST_KEY);
        if (stored) setGuestCompanyState(JSON.parse(stored));
      } catch {}
    }
  }, [user]);

  const setGuestCompany = (info: CompanyInfo) => {
    setGuestCompanyState(info);
    localStorage.setItem(GUEST_KEY, JSON.stringify(info));
  };

  const companyInfo = useMemo<CompanyInfo>(() => {
    if (!user) return guestCompany;
    if (!company) return defaultCompanyInfo;
    return {
      name: company.name,
      ceoName: company.ceo_name,
      businessNumber: company.business_number,
      address: company.address || "",
      phone: company.phone || "",
    };
  }, [user, company, guestCompany]);

  return {
    companyInfo,
    loading: user ? loading : false,
    setGuestCompany,
    isGuest: !user,
  };
}
