import { createClient } from "@/lib/supabase/client";
import { Employee } from "@/types";

const supabase = createClient();

export interface ChangeReportInput {
  employeeId: string;
  changeDate: Date;
  changeType: "income" | "name" | "address" | "other";
  beforeValue: string;
  afterValue: string;
  newMonthlyIncome?: number;
  companyInfo: {
    nationalPensionBizNum: string;
    healthInsuranceBizNum: string;
  };
}

export interface ChangeReportResult {
  success: boolean;
  reportId?: string;
  csvData: {
    nationalPension?: string;
    healthInsurance?: string;
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

function generateNationalPensionChangeCSV(
  bizNum: string,
  rrn: string,
  name: string,
  changeDate: string,
  newIncome: number,
): string {
  const headers = [
    "사업장관리번호",
    "주민등록번호",
    "성명",
    "변경적용일",
    "변경후소득월액",
    "휴대폰",
  ];
  const row = [bizNum, rrn, name, changeDate, String(newIncome), ""];
  return "\uFEFF" + [headers.join(","), row.join(",")].join("\n");
}

function generateHealthInsuranceChangeCSV(
  bizNum: string,
  rrn: string,
  name: string,
  changeDate: string,
  newIncome: number,
): string {
  const headers = [
    "사업장기호",
    "변경적용일",
    "주민등록번호",
    "성명",
    "변경후월보수월액",
  ];
  const row = [bizNum, changeDate, rrn, name, String(newIncome)];
  return "\uFEFF" + [headers.join(","), row.join(",")].join("\n");
}

export async function generateChangeReport(
  input: ChangeReportInput,
  employee: Employee,
): Promise<ChangeReportResult> {
  const errors: string[] = [];

  if (!employee.info.residentNumber) {
    errors.push("주민등록번호가 필요합니다.");
  }

  if (!employee.info.name) {
    errors.push("직원 이름이 필요합니다.");
  }

  if (input.changeType === "income" && !input.newMonthlyIncome) {
    errors.push("소득 변경 시 새로운 월소득이 필요합니다.");
  }

  if (errors.length > 0) {
    return { success: false, csvData: {}, errors };
  }

  const rrn = cleanResidentNumber(employee.info.residentNumber!);
  const formattedDate = formatDate(input.changeDate);

  const csvData: ChangeReportResult["csvData"] = {};

  if (input.changeType === "income" && input.newMonthlyIncome) {
    csvData.nationalPension = generateNationalPensionChangeCSV(
      input.companyInfo.nationalPensionBizNum,
      rrn,
      employee.info.name,
      formattedDate,
      input.newMonthlyIncome,
    );

    csvData.healthInsurance = generateHealthInsuranceChangeCSV(
      input.companyInfo.healthInsuranceBizNum,
      rrn,
      employee.info.name,
      formattedDate,
      input.newMonthlyIncome,
    );
  }

  const { data: report, error } = await supabase
    .from("insurance_reports")
    .insert({
      report_type: "change",
      employee_id: input.employeeId,
      report_date: formattedDate,
      status: "pending",
      csv_data: csvData,
      change_details: {
        change_type: input.changeType,
        before_value: input.beforeValue,
        after_value: input.afterValue,
      },
    })
    .select()
    .single();

  if (error) {
    return { success: false, csvData, errors: [error.message] };
  }

  return { success: true, reportId: report.id, csvData };
}

export async function bulkIncomeChangeReport(
  inputs: ChangeReportInput[],
  employees: Employee[],
): Promise<{
  success: boolean;
  results: ChangeReportResult[];
  combinedCSV: {
    nationalPension: string;
    healthInsurance: string;
  };
}> {
  const results: ChangeReportResult[] = [];
  const nationalPensionLines: string[] = [
    "사업장관리번호,주민등록번호,성명,변경적용일,변경후소득월액,휴대폰",
  ];
  const healthInsuranceLines: string[] = [
    "사업장기호,변경적용일,주민등록번호,성명,변경후월보수월액",
  ];

  for (const input of inputs) {
    const employee = employees.find((e) => e.id === input.employeeId);
    if (!employee || input.changeType !== "income" || !input.newMonthlyIncome)
      continue;

    const result = await generateChangeReport(input, employee);
    results.push(result);

    if (result.success) {
      const rrn = cleanResidentNumber(employee.info.residentNumber || "");
      const formattedDate = formatDate(input.changeDate);

      nationalPensionLines.push(
        [
          input.companyInfo.nationalPensionBizNum,
          rrn,
          employee.info.name,
          formattedDate,
          input.newMonthlyIncome,
          "",
        ].join(","),
      );

      healthInsuranceLines.push(
        [
          input.companyInfo.healthInsuranceBizNum,
          formattedDate,
          rrn,
          employee.info.name,
          input.newMonthlyIncome,
        ].join(","),
      );
    }
  }

  return {
    success: results.every((r) => r.success),
    results,
    combinedCSV: {
      nationalPension: "\uFEFF" + nationalPensionLines.join("\n"),
      healthInsurance: "\uFEFF" + healthInsuranceLines.join("\n"),
    },
  };
}
