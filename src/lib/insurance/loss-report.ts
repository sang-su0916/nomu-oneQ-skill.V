import { createClient } from "@/lib/supabase/client";
import {
  NationalPensionLossRow,
  HealthInsuranceLossRow,
  EmploymentInsuranceLossRow,
  IndustrialAccidentLossRow,
  generateNationalPensionLossCSV,
  generateHealthInsuranceLossCSV,
  generateEmploymentInsuranceLossCSV,
  generateIndustrialAccidentLossCSV,
} from "@/lib/formats/insurance-csv-formats";
import { Employee } from "@/types";

const supabase = createClient();

export interface LossReportInput {
  employeeId: string;
  lossDate: Date;
  lossCode?: string;
  lossReason?: string;
  companyInfo: {
    nationalPensionBizNum: string;
    healthInsuranceBizNum: string;
    employmentInsuranceBizNum: string;
    industrialAccidentBizNum: string;
  };
}

export interface LossReportResult {
  success: boolean;
  reportId?: string;
  csvData: {
    nationalPension: string;
    healthInsurance: string;
    employmentInsurance: string;
    industrialAccident: string;
  };
  errors?: string[];
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function cleanResidentNumber(rrn: string): string {
  return rrn.replace(/-/g, "");
}

export async function generateLossReport(
  input: LossReportInput,
  employee: Employee,
): Promise<LossReportResult> {
  const errors: string[] = [];

  if (!employee.info.residentNumber) {
    errors.push("주민등록번호가 필요합니다.");
  }

  if (!employee.info.name) {
    errors.push("직원 이름이 필요합니다.");
  }

  if (errors.length > 0) {
    return {
      success: false,
      csvData: {} as LossReportResult["csvData"],
      errors,
    };
  }

  const rrn = cleanResidentNumber(employee.info.residentNumber!);
  const formattedDate = formatDate(input.lossDate);

  const nationalPensionRow: NationalPensionLossRow = {
    사업장관리번호: input.companyInfo.nationalPensionBizNum,
    주민등록번호: rrn,
    성명: employee.info.name,
    상실일자: formattedDate,
    상실부호: input.lossCode || "1",
    휴대폰: employee.info.phone || "",
  };

  const healthInsuranceRow: HealthInsuranceLossRow = {
    사업장기호: input.companyInfo.healthInsuranceBizNum,
    자격상실일: formattedDate,
    주민등록번호: rrn,
    성명: employee.info.name,
    상실부호: input.lossCode || "01",
  };

  const employmentInsuranceRow: EmploymentInsuranceLossRow = {
    사업장관리번호: input.companyInfo.employmentInsuranceBizNum,
    근로자주민등록번호: rrn,
    근로자성명: employee.info.name,
    자격상실일: formattedDate,
    상실부호: input.lossCode || "1",
    상실사유: input.lossReason || "",
  };

  const industrialAccidentRow: IndustrialAccidentLossRow = {
    사업장관리번호: input.companyInfo.industrialAccidentBizNum,
    피보험자주민등록번호: rrn,
    피보험자성명: employee.info.name,
    자격상실일: formattedDate,
    상실부호: input.lossCode || "1",
    비고: input.lossReason || "",
  };

  const csvData = {
    nationalPension: generateNationalPensionLossCSV([nationalPensionRow]),
    healthInsurance: generateHealthInsuranceLossCSV([healthInsuranceRow]),
    employmentInsurance: generateEmploymentInsuranceLossCSV([
      employmentInsuranceRow,
    ]),
    industrialAccident: generateIndustrialAccidentLossCSV([
      industrialAccidentRow,
    ]),
  };

  const { data: report, error } = await supabase
    .from("insurance_reports")
    .insert({
      report_type: "loss",
      employee_id: input.employeeId,
      report_date: formattedDate,
      status: "pending",
      csv_data: csvData,
    })
    .select()
    .single();

  if (error) {
    return { success: false, csvData, errors: [error.message] };
  }

  return { success: true, reportId: report.id, csvData };
}

export async function bulkLossReport(
  inputs: LossReportInput[],
  employees: Employee[],
): Promise<{
  success: boolean;
  results: LossReportResult[];
  combinedCSV: {
    nationalPension: string;
    healthInsurance: string;
    employmentInsurance: string;
    industrialAccident: string;
  };
}> {
  const results: LossReportResult[] = [];
  const nationalPensionRows: NationalPensionLossRow[] = [];
  const healthInsuranceRows: HealthInsuranceLossRow[] = [];
  const employmentInsuranceRows: EmploymentInsuranceLossRow[] = [];
  const industrialAccidentRows: IndustrialAccidentLossRow[] = [];

  for (const input of inputs) {
    const employee = employees.find((e) => e.id === input.employeeId);
    if (!employee) continue;

    const result = await generateLossReport(input, employee);
    results.push(result);

    if (result.success) {
      const rrn = cleanResidentNumber(employee.info.residentNumber || "");
      const formattedDate = formatDate(input.lossDate);

      nationalPensionRows.push({
        사업장관리번호: input.companyInfo.nationalPensionBizNum,
        주민등록번호: rrn,
        성명: employee.info.name,
        상실일자: formattedDate,
        상실부호: input.lossCode || "1",
        휴대폰: employee.info.phone || "",
      });

      healthInsuranceRows.push({
        사업장기호: input.companyInfo.healthInsuranceBizNum,
        자격상실일: formattedDate,
        주민등록번호: rrn,
        성명: employee.info.name,
        상실부호: input.lossCode || "01",
      });

      employmentInsuranceRows.push({
        사업장관리번호: input.companyInfo.employmentInsuranceBizNum,
        근로자주민등록번호: rrn,
        근로자성명: employee.info.name,
        자격상실일: formattedDate,
        상실부호: input.lossCode || "1",
        상실사유: input.lossReason || "",
      });

      industrialAccidentRows.push({
        사업장관리번호: input.companyInfo.industrialAccidentBizNum,
        피보험자주민등록번호: rrn,
        피보험자성명: employee.info.name,
        자격상실일: formattedDate,
        상실부호: input.lossCode || "1",
        비고: input.lossReason || "",
      });
    }
  }

  return {
    success: results.every((r) => r.success),
    results,
    combinedCSV: {
      nationalPension: generateNationalPensionLossCSV(nationalPensionRows),
      healthInsurance: generateHealthInsuranceLossCSV(healthInsuranceRows),
      employmentInsurance: generateEmploymentInsuranceLossCSV(
        employmentInsuranceRows,
      ),
      industrialAccident: generateIndustrialAccidentLossCSV(
        industrialAccidentRows,
      ),
    },
  };
}
