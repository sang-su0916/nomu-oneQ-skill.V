import { createClient } from "@/lib/supabase/client";
import {
  NationalPensionAcquisitionRow,
  HealthInsuranceAcquisitionRow,
  EmploymentInsuranceAcquisitionRow,
  IndustrialAccidentAcquisitionRow,
  generateNationalPensionAcquisitionCSV,
  generateHealthInsuranceAcquisitionCSV,
  generateEmploymentInsuranceAcquisitionCSV,
  generateIndustrialAccidentAcquisitionCSV,
} from "@/lib/formats/insurance-csv-formats";
import { Employee } from "@/types";

const supabase = createClient();

export interface AcquisitionReportInput {
  employeeId: string;
  acquisitionDate: Date;
  monthlyIncome: number;
  acquisitionCode?: string;
  isForeigner?: boolean;
  visaType?: string;
  isMarriageImmigrant?: boolean;
  companyInfo: {
    nationalPensionBizNum: string;
    healthInsuranceBizNum: string;
    employmentInsuranceBizNum: string;
    industrialAccidentBizNum: string;
  };
}

export interface AcquisitionReportResult {
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

export async function generateAcquisitionReport(
  input: AcquisitionReportInput,
  employee: Employee,
): Promise<AcquisitionReportResult> {
  const errors: string[] = [];

  if (!employee.info?.residentNumber) {
    errors.push("주민등록번호가 필요합니다.");
  }

  if (!employee.info?.name) {
    errors.push("직원 이름이 필요합니다.");
  }

  if (errors.length > 0) {
    return {
      success: false,
      csvData: {} as AcquisitionReportResult["csvData"],
      errors,
    };
  }

  const rrn = cleanResidentNumber(employee.info.residentNumber);
  const formattedDate = formatDate(input.acquisitionDate);

  const nationalPensionRow: NationalPensionAcquisitionRow = {
    사업장관리번호: input.companyInfo.nationalPensionBizNum,
    주민등록번호: rrn,
    성명: employee.info.name,
    취득일자: formattedDate,
    취득월납부예정금액: Math.round(input.monthlyIncome * 0.09),
    소득월액: input.monthlyIncome,
    취득부호: input.acquisitionCode || "1",
    휴대폰: employee.info.phone || "",
    이메일: "",
  };

  const healthInsuranceRow: HealthInsuranceAcquisitionRow = {
    사업장기호: input.companyInfo.healthInsuranceBizNum,
    자격취득일: formattedDate,
    주민등록번호: rrn,
    성명: employee.info.name,
    월보수월액: input.monthlyIncome,
    취득부호: input.acquisitionCode || "11",
    등록외국인여부: input.isForeigner ? "1" : "0",
    체류자격: input.visaType || "",
    결혼이민자여부: input.isMarriageImmigrant ? "1" : "0",
  };

  const employmentInsuranceRow: EmploymentInsuranceAcquisitionRow = {
    사업장관리번호: input.companyInfo.employmentInsuranceBizNum,
    근로자주민등록번호: rrn,
    근로자성명: employee.info.name,
    자격취득일: formattedDate,
    월평균보수: input.monthlyIncome,
    취득부호: input.acquisitionCode || "1",
    비고: "",
  };

  const industrialAccidentRow: IndustrialAccidentAcquisitionRow = {
    사업장관리번호: input.companyInfo.industrialAccidentBizNum,
    피보험자주민등록번호: rrn,
    피보험자성명: employee.info.name,
    자격취득일: formattedDate,
    소득월액: input.monthlyIncome,
    취득부호: input.acquisitionCode || "1",
    비고: "",
  };

  const csvData = {
    nationalPension: generateNationalPensionAcquisitionCSV([
      nationalPensionRow,
    ]),
    healthInsurance: generateHealthInsuranceAcquisitionCSV([
      healthInsuranceRow,
    ]),
    employmentInsurance: generateEmploymentInsuranceAcquisitionCSV([
      employmentInsuranceRow,
    ]),
    industrialAccident: generateIndustrialAccidentAcquisitionCSV([
      industrialAccidentRow,
    ]),
  };

  const { data: report, error } = await supabase
    .from("insurance_reports")
    .insert({
      report_type: "acquisition",
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

export async function bulkAcquisitionReport(
  inputs: AcquisitionReportInput[],
  employees: Employee[],
): Promise<{
  success: boolean;
  results: AcquisitionReportResult[];
  combinedCSV: {
    nationalPension: string;
    healthInsurance: string;
    employmentInsurance: string;
    industrialAccident: string;
  };
}> {
  const results: AcquisitionReportResult[] = [];
  const nationalPensionRows: NationalPensionAcquisitionRow[] = [];
  const healthInsuranceRows: HealthInsuranceAcquisitionRow[] = [];
  const employmentInsuranceRows: EmploymentInsuranceAcquisitionRow[] = [];
  const industrialAccidentRows: IndustrialAccidentAcquisitionRow[] = [];

  for (const input of inputs) {
    const employee = employees.find((e) => e.id === input.employeeId);
    if (!employee) continue;

    const result = await generateAcquisitionReport(input, employee);
    results.push(result);

    if (result.success) {
      const rrn = cleanResidentNumber(employee.info.residentNumber || "");
      const formattedDate = formatDate(input.acquisitionDate);

      nationalPensionRows.push({
        사업장관리번호: input.companyInfo.nationalPensionBizNum,
        주민등록번호: rrn,
        성명: employee.info.name,
        취득일자: formattedDate,
        취득월납부예정금액: Math.round(input.monthlyIncome * 0.09),
        소득월액: input.monthlyIncome,
        취득부호: input.acquisitionCode || "1",
        휴대폰: employee.info.phone || "",
        이메일: "",
      });

      healthInsuranceRows.push({
        사업장기호: input.companyInfo.healthInsuranceBizNum,
        자격취득일: formattedDate,
        주민등록번호: rrn,
        성명: employee.info.name,
        월보수월액: input.monthlyIncome,
        취득부호: input.acquisitionCode || "11",
        등록외국인여부: input.isForeigner ? "1" : "0",
        체류자격: input.visaType || "",
        결혼이민자여부: input.isMarriageImmigrant ? "1" : "0",
      });

      employmentInsuranceRows.push({
        사업장관리번호: input.companyInfo.employmentInsuranceBizNum,
        근로자주민등록번호: rrn,
        근로자성명: employee.info.name,
        자격취득일: formattedDate,
        월평균보수: input.monthlyIncome,
        취득부호: input.acquisitionCode || "1",
        비고: "",
      });

      industrialAccidentRows.push({
        사업장관리번호: input.companyInfo.industrialAccidentBizNum,
        피보험자주민등록번호: rrn,
        피보험자성명: employee.info.name,
        자격취득일: formattedDate,
        소득월액: input.monthlyIncome,
        취득부호: input.acquisitionCode || "1",
        비고: "",
      });
    }
  }

  return {
    success: results.every((r) => r.success),
    results,
    combinedCSV: {
      nationalPension:
        generateNationalPensionAcquisitionCSV(nationalPensionRows),
      healthInsurance:
        generateHealthInsuranceAcquisitionCSV(healthInsuranceRows),
      employmentInsurance: generateEmploymentInsuranceAcquisitionCSV(
        employmentInsuranceRows,
      ),
      industrialAccident: generateIndustrialAccidentAcquisitionCSV(
        industrialAccidentRows,
      ),
    },
  };
}
