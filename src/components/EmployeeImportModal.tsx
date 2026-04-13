"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { extractTableFromPdf } from "@/lib/pdf-table-parser";
import type { Employee, EmploymentType } from "@/types";

// 매핑 가능한 필드 목록
const MAPPABLE_FIELDS = [
  { key: "skip", label: "(건너뛰기)" },
  { key: "name", label: "이름 *", required: true },
  { key: "residentNumber", label: "주민등록번호" },
  { key: "phone", label: "연락처" },
  { key: "address", label: "주소" },
  { key: "employmentType", label: "고용형태" },
  { key: "department", label: "부서" },
  { key: "position", label: "직위" },
  { key: "hireDate", label: "입사일" },
  { key: "baseSalary", label: "기본급 (월급)" },
  { key: "hourlyWage", label: "시급" },
  { key: "mealAllowance", label: "식대" },
] as const;

type FieldKey = (typeof MAPPABLE_FIELDS)[number]["key"];

// 컬럼 헤더 → 필드 자동 매핑
const AUTO_MAP: Record<string, FieldKey> = {
  이름: "name",
  성명: "name",
  직원명: "name",
  name: "name",
  사원명: "name",
  주민등록번호: "residentNumber",
  주민번호: "residentNumber",
  연락처: "phone",
  전화번호: "phone",
  핸드폰: "phone",
  phone: "phone",
  휴대폰: "phone",
  주소: "address",
  address: "address",
  고용형태: "employmentType",
  근무형태: "employmentType",
  고용유형: "employmentType",
  부서: "department",
  department: "department",
  부서명: "department",
  직위: "position",
  직급: "position",
  직책: "position",
  position: "position",
  입사일: "hireDate",
  입사: "hireDate",
  hire_date: "hireDate",
  입사날짜: "hireDate",
  입사일자: "hireDate",
  기본급: "baseSalary",
  월급: "baseSalary",
  급여: "baseSalary",
  salary: "baseSalary",
  월급여: "baseSalary",
  급여액: "baseSalary",
  지급액: "baseSalary",
  총지급액: "baseSalary",
  시급: "hourlyWage",
  hourly: "hourlyWage",
  식대: "mealAllowance",
  식비: "mealAllowance",
};

// 행이 헤더인지 판단: "이름/성명" 등 핵심 키워드가 포함된 행
function scoreHeaderRow(row: string[]): number {
  let score = 0;
  const matched = new Set<FieldKey>();
  for (const cell of row) {
    const normalized = cell.trim().toLowerCase().replace(/\s+/g, "");
    if (!normalized) continue;
    for (const [pattern, field] of Object.entries(AUTO_MAP)) {
      if (
        normalized === pattern.toLowerCase().replace(/\s+/g, "") ||
        normalized.includes(pattern.toLowerCase())
      ) {
        if (!matched.has(field)) {
          matched.add(field);
          score += field === "name" ? 10 : 1; // "이름" 필드는 가중치 높음
        }
        break;
      }
    }
  }
  return score;
}

// 상위 N행에서 가장 헤더 같은 행을 찾음
function findHeaderRow(allRows: string[][], maxScan = 15): number {
  let bestIdx = 0;
  let bestScore = 0;
  const limit = Math.min(maxScan, allRows.length);
  for (let i = 0; i < limit; i++) {
    const score = scoreHeaderRow(allRows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore >= 10 ? bestIdx : 0; // "이름"이 있어야(10점+) 의미 있는 헤더
}

// 고용형태 문자열 → EmploymentType
function parseEmploymentType(val: string): EmploymentType {
  const v = val.trim().toLowerCase();
  if (
    [
      "파트타임",
      "parttime",
      "part-time",
      "단시간",
      "아르바이트",
      "알바",
      "part",
      "시간제",
      "비정규직",
      "계약직",
    ].includes(v)
  )
    return "parttime";
  if (
    [
      "프리랜서",
      "freelancer",
      "용역",
      "위탁",
      "외주",
      "도급",
      "contractor",
      "freelance",
    ].includes(v)
  )
    return "freelancer";
  return "fulltime";
}

// 날짜 파싱 (다양한 형식 허용)
function parseDate(val: string): string {
  if (!val) return new Date().toISOString().split("T")[0];
  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(val)) return val;
  // YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(val)) return val.replace(/\//g, "-");
  // YYYY.MM.DD
  if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(val)) return val.replace(/\./g, "-");
  // YYYYMMDD (구분자 없음)
  if (/^\d{8}$/.test(val))
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  // MM/DD/YYYY or MM-DD-YYYY
  const m = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  // Excel serial date number
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = new Date((num - 25569) * 86400000);
    return d.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

// 숫자 파싱 (콤마, 원 등 제거)
function parseNumber(val: string): number {
  if (!val) return 0;
  return parseInt(val.replace(/[^0-9]/g, "")) || 0;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (
    employees: Omit<Employee, "id" | "createdAt" | "updatedAt">[],
  ) => void;
  currentCount: number;
  maxCount: number;
}

type Step = "upload" | "mapping" | "preview";

export default function EmployeeImportModal({
  open,
  onClose,
  onImport,
  currentCount,
  maxCount,
}: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<FieldKey[]>([]);
  const [parsed, setParsed] = useState<
    Omit<Employee, "id" | "createdAt" | "updatedAt">[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setColumnMap([]);
    setParsed([]);
    setErrors([]);
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ["csv", "xlsx", "xls", "pdf"].includes(ext || "");
    });
    if (files.length === 0) {
      setErrors([
        "CSV(.csv), Excel(.xlsx, .xls), PDF(.pdf) 파일만 지원합니다.",
      ]);
      return;
    }
    if (files.length === 1) {
      handleFile(files[0]);
    } else {
      setPendingFiles(files);
      setCurrentFileIndex(0);
      handleFile(files[0]);
    }
  };

  // 단일 파일 파싱
  const handleFile = (file: File) => {
    setFileName(file.name);
    setErrors([]);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as string[][];
          if (data.length < 2) {
            setErrors(["데이터가 2행 이상이어야 합니다 (헤더 + 데이터)."]);
            return;
          }
          processAllData(data);
        },
        error: () => setErrors(["CSV 파일 파싱에 실패했습니다."]),
      });
    } else if (["xlsx", "xls"].includes(ext || "")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data: string[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: "",
          });
          if (data.length < 2) {
            setErrors(["데이터가 2행 이상이어야 합니다 (헤더 + 데이터)."]);
            return;
          }
          const strData = data.map((row) =>
            row.map((cell) => String(cell ?? "")),
          );
          processAllData(strData);
        } catch {
          setErrors(["Excel 파일을 읽을 수 없습니다."]);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "pdf") {
      setPdfLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const data = await extractTableFromPdf(buffer);
          if (data.length < 2) {
            setErrors([
              "PDF에서 표 데이터를 찾지 못했습니다. 표 형식의 PDF인지 확인해주세요.",
            ]);
            setPdfLoading(false);
            return;
          }
          processAllData(data);
        } catch {
          setErrors([
            "PDF 파일을 읽을 수 없습니다. 텍스트 기반 PDF만 지원합니다 (스캔/이미지 PDF는 불가).",
          ]);
        } finally {
          setPdfLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrors([
        "CSV(.csv), Excel(.xlsx, .xls), PDF(.pdf) 파일만 지원합니다.",
      ]);
    }
  };

  // 다중 파일: 다음 파일로 이동
  const handleNextFile = () => {
    const nextIdx = currentFileIndex + 1;
    if (nextIdx < pendingFiles.length) {
      setCurrentFileIndex(nextIdx);
      setStep("upload");
      handleFile(pendingFiles[nextIdx]);
    }
  };

  const hasMoreFiles =
    pendingFiles.length > 1 && currentFileIndex < pendingFiles.length - 1;

  const processAllData = (allRows: string[][]) => {
    // 헤더 행 자동 탐지
    const headerIdx = findHeaderRow(allRows);
    const headerRow = allRows[headerIdx];
    const dataRows = allRows.slice(headerIdx + 1);

    // 빈 행 제거
    const filtered = dataRows.filter((row) =>
      row.some((cell) => cell.trim() !== ""),
    );
    if (filtered.length === 0) {
      setErrors(["데이터 행을 찾지 못했습니다. 파일을 확인해주세요."]);
      return;
    }
    setHeaders(headerRow);
    setRows(filtered);

    // 자동 컬럼 매핑
    const autoMap = headerRow.map((h) => {
      const normalized = h.trim().toLowerCase().replace(/\s+/g, "");
      for (const [pattern, field] of Object.entries(AUTO_MAP)) {
        if (normalized === pattern.toLowerCase().replace(/\s+/g, ""))
          return field;
      }
      // 부분 매칭
      for (const [pattern, field] of Object.entries(AUTO_MAP)) {
        if (normalized.includes(pattern.toLowerCase())) return field;
      }
      return "skip" as FieldKey;
    });
    setColumnMap(autoMap);
    setErrors([]);

    // "이름" 매핑이 확실하면 매핑 단계 스킵 → 바로 미리보기
    const mappedCount = autoMap.filter((f) => f !== "skip").length;
    if (autoMap.includes("name") && mappedCount >= 2) {
      // 매핑 확정 후 바로 미리보기 생성
      generatePreviewFromData(autoMap, headerRow, filtered);
    } else {
      setStep("mapping");
    }
  };

  // 미리보기 생성 (공통 로직)
  const buildPreview = (map: FieldKey[], dataRows: string[][]) => {
    const newErrors: string[] = [];
    const result: Omit<Employee, "id" | "createdAt" | "updatedAt">[] = [];
    const available = maxCount - currentCount;

    dataRows.forEach((row, ri) => {
      const getValue = (field: FieldKey): string => {
        const idx = map.indexOf(field);
        return idx >= 0 ? (row[idx] || "").trim() : "";
      };

      const name = getValue("name");
      if (!name) {
        newErrors.push(`${ri + 2}행: 이름이 비어있어 건너뜁니다.`);
        return;
      }

      if (result.length >= available) {
        newErrors.push(
          `${ri + 2}행: 등급 제한(최대 ${maxCount}명)으로 건너뜁니다.`,
        );
        return;
      }

      const empType = getValue("employmentType");
      const employmentType = empType
        ? parseEmploymentType(empType)
        : "fulltime";
      const baseSalary = parseNumber(getValue("baseSalary"));
      const hourlyWage = parseNumber(getValue("hourlyWage"));

      result.push({
        info: {
          name,
          residentNumber: getValue("residentNumber"),
          phone: getValue("phone"),
          address: getValue("address"),
        },
        employmentType,
        status: "active",
        hireDate: parseDate(getValue("hireDate")),
        department: getValue("department") || undefined,
        position: getValue("position") || undefined,
        salary: {
          type: employmentType === "parttime" ? "hourly" : "monthly",
          baseSalary: employmentType === "parttime" ? 0 : baseSalary,
          hourlyWage:
            employmentType === "parttime"
              ? hourlyWage || baseSalary
              : undefined,
          mealAllowance: parseNumber(getValue("mealAllowance")) || 200000,
          carAllowance: 0,
          childcareAllowance: 0,
          researchAllowance: 0,
          otherAllowances: [],
        },
        workCondition: {
          weeklyHours: employmentType === "parttime" ? 20 : 40,
          workDays: ["월", "화", "수", "목", "금"],
          workStartTime: "09:00",
          workEndTime: "18:00",
          breakTime: 60,
        },
        insurance: {
          national: true,
          health: true,
          employment: true,
          industrial: true,
        },
        taxDependents: { dependents: 1, childrenUnder20: 0 },
        taxExemptOptions: {
          hasOwnCar: false,
          hasChildUnder6: false,
          isResearcher: false,
        },
      });
    });

    return { result, newErrors };
  };

  // 자동 매핑으로 바로 미리보기 생성
  const generatePreviewFromData = (
    map: FieldKey[],
    _headerRow: string[],
    dataRows: string[][],
  ) => {
    const { result, newErrors } = buildPreview(map, dataRows);
    setParsed(result);
    setErrors(newErrors);
    setStep("preview");
  };

  // 매핑 확정 → 미리보기 생성 (수동 매핑 화면에서 호출)
  const generatePreview = () => {
    if (!columnMap.includes("name")) {
      setErrors(["이름 필드를 반드시 매핑해주세요."]);
      return;
    }
    const { result, newErrors } = buildPreview(columnMap, rows);
    setParsed(result);
    setErrors(newErrors);
    setStep("preview");
  };

  // 최종 가져오기
  const handleImport = async () => {
    setImporting(true);
    try {
      onImport(parsed);
      handleClose();
    } catch {
      setErrors(["가져오기 중 오류가 발생했습니다."]);
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const EMPLOYMENT_LABELS: Record<string, string> = {
    fulltime: "정규직",
    parttime: "파트타임",
    freelancer: "프리랜서",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">
              파일에서 직원 가져오기
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {step === "upload" && "CSV, Excel, PDF 파일을 업로드하세요"}
              {step === "mapping" &&
                "파일의 컬럼을 직원 정보 필드에 매핑하세요"}
              {step === "preview" && "가져올 직원 정보를 확인하세요"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl"
          >
            ✕
          </button>
        </div>

        {/* 스텝 표시 */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[var(--bg)]">
          {(["upload", "mapping", "preview"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-[var(--text-muted)]">→</span>}
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  step === s
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                }`}
              >
                {i + 1}.{" "}
                {s === "upload"
                  ? "파일 선택"
                  : s === "mapping"
                    ? "컬럼 매핑"
                    : "미리보기"}
              </span>
            </div>
          ))}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 에러 표시 */}
          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-1">
                알림 ({errors.length}건)
              </p>
              <ul className="text-xs text-amber-700 space-y-1 max-h-24 overflow-y-auto">
                {errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 1: 파일 업로드 */}
          {step === "upload" && (
            <div>
              <div
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-12 text-center cursor-pointer hover:border-[var(--primary)] hover:bg-blue-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="text-5xl mb-4">📂</div>
                <p className="text-lg font-medium text-[var(--text)] mb-2">
                  파일을 여기에 드래그하거나 클릭해서 선택하세요
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  지원 형식: CSV (.csv), Excel (.xlsx, .xls), PDF (.pdf)
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2 opacity-70">
                  PDF는 표(table) 형식만 지원됩니다 (스캔/이미지 PDF 불가)
                </p>
              </div>

              {/* PDF 로딩 표시 */}
              {pdfLoading && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="text-sm text-blue-800">
                    PDF에서 표 데이터를 추출하고 있습니다...
                  </span>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  if (files.length === 1) {
                    setPendingFiles([]);
                    handleFile(files[0]);
                  } else {
                    setPendingFiles(files);
                    setCurrentFileIndex(0);
                    handleFile(files[0]);
                  }
                  // input 리셋 (같은 파일 다시 선택 가능하도록)
                  e.target.value = "";
                }}
              />

              {/* 파일 형식별 안내 */}
              <div className="mt-6 space-y-3">
                {/* 추천 */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-lg flex-shrink-0 mt-0.5">
                      ✅
                    </span>
                    <div>
                      <p className="text-sm font-medium text-green-800 mb-1">
                        CSV, Excel을 추천합니다
                      </p>
                      <p className="text-xs text-green-700 leading-relaxed">
                        기존에 엑셀이나 스프레드시트로 직원 명부를 관리하고
                        계셨다면, 그 파일을 그대로 올려주세요. 컬럼(이름, 부서,
                        급여 등)을 자동으로 인식하기 때문에{" "}
                        <strong>가장 정확하게</strong> 가져올 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PDF 주의사항 */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg flex-shrink-0 mt-0.5">
                      ⚠️
                    </span>
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">
                        PDF도 가능하지만, 결과를 꼭 확인해주세요
                      </p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        PDF는 표의 칸 위치를 추정해서 읽기 때문에, 칸이 밀리거나
                        빠지는 경우가 있습니다. 가져온 후{" "}
                        <strong>미리보기 화면에서 반드시 확인</strong>해주세요.
                        스캔하거나 사진으로 찍은 PDF(이미지 PDF)는 인식되지
                        않습니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 지원 형식 상세 (접는글) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors select-none list-none flex items-center gap-2">
                    <span className="text-xs transition-transform group-open:rotate-90">
                      ▶
                    </span>
                    어떤 파일이 잘 되고, 어떤 파일이 안 되나요?
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-[var(--text-muted)] leading-relaxed">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="font-medium text-green-800 mb-1">
                        잘 되는 경우
                      </p>
                      <ul className="space-y-0.5 text-green-700">
                        <li>• 엑셀(.xlsx)이나 CSV 파일 — 가장 정확합니다</li>
                        <li>• 첫 번째 행이 헤더(이름, 부서, 급여 등)인 파일</li>
                        <li>• 컴퓨터로 만든 깔끔한 표 형식 PDF</li>
                        <li>
                          • 날짜: 2024-03-01, 2024/03/01, 2024.03.01, 20240301
                          모두 인식
                        </li>
                        <li>
                          • 급여: 3,000,000 / 3000000 / 3000000원 모두 인식
                        </li>
                        <li>
                          • 고용형태: 정규직, 파트타임, 알바, 계약직, 프리랜서,
                          외주 등 자동 인식
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="font-medium text-amber-800 mb-1">
                        주의가 필요한 경우
                      </p>
                      <ul className="space-y-0.5 text-amber-700">
                        <li>
                          • PDF에서 셀이 병합된 표 — 칸이 밀릴 수 있습니다
                        </li>
                        <li>
                          • 표 위아래에 제목이나 설명 텍스트가 있는 PDF — 행으로
                          잡힐 수 있습니다
                        </li>
                        <li>
                          • 한글이 많은 PDF — 자간 차이로 컬럼이 밀릴 수 있으니
                          미리보기에서 확인하세요
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="font-medium text-red-800 mb-1">
                        안 되는 경우
                      </p>
                      <ul className="space-y-0.5 text-red-700">
                        <li>
                          • 스캔하거나 사진으로 찍은 PDF (이미지 PDF) — 글자를
                          인식할 수 없습니다
                        </li>
                        <li>
                          • 표가 아닌 자유 형식 문서 — 행/열 구분이 불가능합니다
                        </li>
                        <li>• 비밀번호로 잠긴 PDF</li>
                      </ul>
                    </div>
                  </div>
                </details>

                {/* 샘플 다운로드 */}
                <div className="p-4 bg-[var(--bg)] rounded-lg">
                  <p className="text-sm font-medium text-[var(--text)] mb-1">
                    👇 처음이시라면 여기부터 시작하세요!
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mb-3">
                    아래 샘플 파일을 다운로드 → 엑셀로 열어서 직원 정보 입력 →
                    저장 후 위에 업로드하면 끝!
                  </p>
                  <button
                    onClick={() => {
                      const csv =
                        "이름,주민등록번호,연락처,고용형태,부서,직위,입사일,기본급,식대\n홍길동,900101-1234567,010-1234-5678,정규직,영업부,과장,2024-03-01,2800000,200000\n김영희,950515-2345678,010-9876-5432,정규직,관리부,대리,2024-06-01,2400000,200000\n박민수,000301-3456789,010-5555-1234,파트타임,매장,직원,2025-01-15,10320,\n이수진,880720-2567890,010-7777-8888,정규직,개발팀,팀장,2023-09-01,3500000,200000";
                      const blob = new Blob(["\uFEFF" + csv], {
                        type: "text/csv;charset=utf-8",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "직원목록_샘플.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-sm text-[var(--primary)] hover:underline font-medium"
                  >
                    📥 샘플 양식 다운로드 (CSV)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 컬럼 매핑 */}
          {step === "mapping" && (
            <div>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>{fileName}</strong> — {rows.length}명의 데이터가
                감지되었습니다. 각 컬럼이 어떤 정보인지 확인해주세요.
              </div>

              {fileName.toLowerCase().endsWith(".pdf") && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <strong>PDF에서 추출한 데이터입니다.</strong> 아래 &quot;샘플
                  데이터&quot;를 보고 컬럼이 제대로 나뉘었는지 꼭 확인해주세요.
                  칸이 밀렸거나 이상하면 CSV/Excel로 변환 후 다시 올리는 것을
                  권장합니다.
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg)]">
                      <th className="text-left p-2 border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                        파일 컬럼
                      </th>
                      <th className="text-left p-2 border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                        매핑 필드
                      </th>
                      <th className="text-left p-2 border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                        샘플 데이터 (처음 3행)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="p-2 font-medium text-[var(--text)]">
                          {h || `(컬럼 ${i + 1})`}
                        </td>
                        <td className="p-2">
                          <select
                            className="input-field py-1 text-sm"
                            value={columnMap[i]}
                            onChange={(e) => {
                              const newMap = [...columnMap];
                              newMap[i] = e.target.value as FieldKey;
                              setColumnMap(newMap);
                            }}
                          >
                            {MAPPABLE_FIELDS.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-xs text-[var(--text-muted)]">
                          {rows
                            .slice(0, 3)
                            .map((r) => r[i] || "-")
                            .join(" / ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!columnMap.includes("name") && (
                <p className="mt-3 text-sm text-red-600 font-medium">
                  &quot;이름&quot; 필드를 반드시 매핑해주세요.
                </p>
              )}
            </div>
          )}

          {/* Step 3: 미리보기 */}
          {step === "preview" && (
            <div>
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <strong>{parsed.length}명</strong>의 직원을 가져올 준비가
                되었습니다.
                {currentCount > 0 &&
                  ` (기존 ${currentCount}명 + 신규 ${parsed.length}명 = 총 ${currentCount + parsed.length}명)`}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg)]">
                      <th className="text-left p-2 border-b border-[var(--border)]">
                        #
                      </th>
                      <th className="text-left p-2 border-b border-[var(--border)]">
                        이름
                      </th>
                      <th className="text-left p-2 border-b border-[var(--border)]">
                        고용형태
                      </th>
                      <th className="text-left p-2 border-b border-[var(--border)]">
                        부서
                      </th>
                      <th className="text-left p-2 border-b border-[var(--border)]">
                        직위
                      </th>
                      <th className="text-left p-2 border-b border-[var(--border)]">
                        입사일
                      </th>
                      <th className="text-right p-2 border-b border-[var(--border)]">
                        급여
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((emp, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)] hover:bg-[var(--bg)]"
                      >
                        <td className="p-2 text-[var(--text-muted)]">
                          {i + 1}
                        </td>
                        <td className="p-2 font-medium text-[var(--text)]">
                          {emp.info.name}
                        </td>
                        <td className="p-2">
                          <span
                            className={`badge ${
                              emp.employmentType === "fulltime"
                                ? "badge-primary"
                                : emp.employmentType === "parttime"
                                  ? "badge-info"
                                  : "badge-warning"
                            }`}
                          >
                            {EMPLOYMENT_LABELS[emp.employmentType]}
                          </span>
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          {emp.department || "-"}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          {emp.position || "-"}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          {emp.hireDate}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {emp.salary.type === "monthly"
                            ? `${(emp.salary.baseSalary / 10000).toFixed(0)}만원`
                            : `시급 ${emp.salary.hourlyWage?.toLocaleString()}원`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-[var(--bg)] rounded-lg text-xs text-[var(--text-muted)] space-y-1">
                <p>
                  • 4대보험, 근무시간, 비과세 옵션 등은 기본값이 적용됩니다.
                </p>
                <p>
                  • 가져온 후 직원 관리 페이지에서 개별적으로 수정할 수
                  있습니다.
                </p>
                <p>• 주민등록번호가 있으면 암호화되어 저장됩니다.</p>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)]">
          <div>
            {step !== "upload" && (
              <button
                onClick={() =>
                  setStep(step === "preview" ? "mapping" : "upload")
                }
                className="btn btn-secondary"
              >
                ← 이전
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose} className="btn btn-secondary">
              취소
            </button>
            {step === "mapping" && (
              <button
                onClick={generatePreview}
                disabled={!columnMap.includes("name")}
                className="btn btn-primary disabled:opacity-50"
              >
                미리보기 →
              </button>
            )}
            {step === "preview" && (
              <button
                onClick={handleImport}
                disabled={importing || parsed.length === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                {importing ? "가져오는 중..." : `${parsed.length}명 가져오기`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
