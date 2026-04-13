/**
 * Supabase DB 액세스 레이어
 * 기존 localStorage 기반 storage.ts를 대체
 * - 주민등록번호(resident_number)는 자동 암호화/복호화
 */
import { createClient } from "@/lib/supabase/client";
import type {
  DbEmployee,
  DbPaymentRecord,
  DbDocument,
  Company,
} from "@/types/database";

const supabase = createClient();

// ============================================
// 주민등록번호 암호화/복호화 헬퍼 (서버 API 경유)
// ============================================
export async function encryptResidentNumber(value: string): Promise<string> {
  if (!value) return "";
  const res = await fetch("/api/encrypt-resident-number", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("암호화 API 오류:", res.status, body);
    throw new Error(body.error || "주민등록번호 암호화 실패");
  }
  const { encrypted } = await res.json();
  return encrypted;
}

export async function decryptResidentNumber(value: string): Promise<string> {
  if (!value) return "";
  const res = await fetch("/api/decrypt-resident-number", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("주민등록번호 복호화 실패");
  const { decrypted } = await res.json();
  return decrypted;
}

export async function decryptResidentNumbers(
  values: string[],
): Promise<string[]> {
  if (values.length === 0) return [];
  const res = await fetch("/api/decrypt-resident-number", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error("주민등록번호 복호화 실패");
  const { decrypted } = await res.json();
  return decrypted;
}

// ============================================
// 직원 관리
// ============================================
export async function getEmployees(companyId: string): Promise<DbEmployee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const employees = data || [];
  // 주민등록번호 배치 복호화
  if (employees.length > 0) {
    const encryptedValues = employees.map((e) => e.resident_number || "");
    try {
      const decrypted = await decryptResidentNumbers(encryptedValues);
      employees.forEach((e, i) => {
        e.resident_number = decrypted[i] || null;
      });
    } catch {
      // 복호화 실패 시 빈 문자열로 대체 (보안 우선)
      employees.forEach((e) => {
        e.resident_number = null;
      });
    }
  }
  return employees;
}

export async function getActiveEmployees(
  companyId: string,
): Promise<DbEmployee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("name");
  if (error) throw error;

  const employees = data || [];
  // 주민등록번호 배치 복호화
  if (employees.length > 0) {
    const encryptedValues = employees.map((e) => e.resident_number || "");
    try {
      const decrypted = await decryptResidentNumbers(encryptedValues);
      employees.forEach((e, i) => {
        e.resident_number = decrypted[i] || null;
      });
    } catch {
      employees.forEach((e) => {
        e.resident_number = null;
      });
    }
  }
  return employees;
}

export async function getEmployeeById(
  employeeId: string,
): Promise<DbEmployee | null> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();
  if (error) return null;

  // 주민등록번호 복호화
  if (data?.resident_number) {
    try {
      data.resident_number = await decryptResidentNumber(data.resident_number);
    } catch {
      data.resident_number = null;
    }
  }
  return data;
}

export async function createEmployee(
  employee: Omit<DbEmployee, "id" | "created_at" | "updated_at">,
): Promise<DbEmployee> {
  // 주민등록번호 암호화 (실패 시에도 평문 유지)
  const insertData = { ...employee };
  if (insertData.resident_number) {
    try {
      insertData.resident_number = await encryptResidentNumber(
        insertData.resident_number,
      );
    } catch (e) {
      console.warn("주민번호 암호화 실패, 평문으로 저장:", e);
      // 평문 유지 (데이터 유실 방지)
    }
  }

  const { data, error } = await supabase
    .from("employees")
    .insert(insertData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEmployee(
  id: string,
  updates: Partial<DbEmployee>,
): Promise<DbEmployee> {
  // 주민등록번호 암호화 (실패 시에도 평문 유지)
  const updateData = { ...updates };
  if (
    updateData.resident_number !== undefined &&
    updateData.resident_number !== null
  ) {
    try {
      updateData.resident_number = await encryptResidentNumber(
        updateData.resident_number,
      );
    } catch (e) {
      console.warn("주민번호 암호화 실패, 평문으로 저장:", e);
      // 평문 유지 (데이터 유실 방지)
    }
  }

  const { data, error } = await supabase
    .from("employees")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// 급여 기록
// ============================================
export async function getPaymentRecords(
  companyId: string,
  year?: number,
  month?: number,
): Promise<DbPaymentRecord[]> {
  let query = supabase
    .from("payment_records")
    .select("*")
    .eq("company_id", companyId);
  if (year) query = query.eq("year", year);
  if (month) query = query.eq("month", month);
  const { data, error } = await query
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getEmployeePayments(
  employeeId: string,
): Promise<DbPaymentRecord[]> {
  const { data, error } = await supabase
    .from("payment_records")
    .select("*")
    .eq("employee_id", employeeId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPaymentRecord(
  record: Omit<DbPaymentRecord, "id" | "created_at">,
): Promise<DbPaymentRecord> {
  const { data, error } = await supabase
    .from("payment_records")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaymentRecord(
  id: string,
  updates: Partial<DbPaymentRecord>,
): Promise<void> {
  const { error } = await supabase
    .from("payment_records")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

// ============================================
// 서류 보관함
// ============================================
export async function getDocuments(
  companyId: string,
  docType?: string,
): Promise<DbDocument[]> {
  let query = supabase
    .from("documents")
    .select("*")
    .eq("company_id", companyId);
  if (docType) query = query.eq("doc_type", docType);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveDocument(
  doc: Omit<DbDocument, "id" | "created_at" | "updated_at">,
): Promise<DbDocument> {
  const { data, error } = await supabase
    .from("documents")
    .insert(doc)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDocumentById(id: string): Promise<DbDocument | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

// ============================================
// 회사 정보
// ============================================
export async function getCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();
  if (error) return null;
  return data;
}

export async function updateCompany(
  companyId: string,
  updates: Partial<Company>,
): Promise<void> {
  const { error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", companyId);
  if (error) throw error;
}

// ============================================
// 멤버 관리
// ============================================
export async function inviteMember(
  companyId: string,
  userId: string,
  role: "manager" | "viewer",
  invitedBy: string,
): Promise<void> {
  const { error } = await supabase.from("company_members").insert({
    company_id: companyId,
    user_id: userId,
    role,
    invited_by: invitedBy,
  });
  if (error) throw error;
}

export async function getCompanyMembers(companyId: string) {
  const { data, error } = await supabase
    .from("company_members")
    .select("*, profiles(full_name, avatar_url)")
    .eq("company_id", companyId);
  if (error) throw error;
  return data || [];
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

// ============================================
// 직원 수 체크 (플랜 제한)
// ============================================
export async function getActiveEmployeeCount(
  companyId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  return count || 0;
}
