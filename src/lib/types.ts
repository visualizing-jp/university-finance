export interface IncomeParts {
  tuition: number;
  subsidies: number;
  donations: number;
  auxiliary: number;
  interest: number;
  other: number;
}

export interface ExpenseParts {
  personnel: number;
  education: number;
  admin: number;
  other: number;
}

export interface FinanceYear {
  year: number;
  income: IncomeParts;
  expense: ExpenseParts;
  activityIncome: number;
  activityExpense: number;
  balanceBeforeReserve: number;
  /** 教育活動収入計 */
  educationIncome: number;
  /** 教育活動外収入計 */
  nonEducationIncome: number;
  /** 教育活動支出計 */
  educationExpense: number;
  /** 教育活動外支出計 */
  nonEducationExpense: number;
  /** 教育活動収入計 + 教育活動外収入計 */
  ordinaryIncome: number;
  /** 教育活動支出計 + 教育活動外支出計 */
  ordinaryExpense: number;
  /** 計算書類の経常収支差額。経常収入 − 経常支出と一致する。 */
  ordinaryBalance: number;
  /** 経常費等補助金。施設設備補助金は含まない。 */
  ordinarySubsidy: number;
  /** 教育活動の寄付金。施設設備寄付金と特別収入の現物寄付は含まない。 */
  ordinaryDonation: number;
  /** 借入金 + 学校債 + 未払金 + 手形債務 */
  externalLiabilities: number;
  externalLiabilityParts: {
    loans: number;
    bonds: number;
    unpaid: number;
    notes: number;
  };
  assets: { fixed: number; current: number };
  liabilities: { fixed: number; current: number };
  netAssets: { basicFund: number; carried: number };
  /** 現金預金 + 特定資産 + 有価証券 */
  operatingAssets: number;
  cash: {
    education: number;
    facility: number;
    other: number;
    opening: number;
    closing: number;
  };
  /** 貸借対照表の現金預金。翌年度繰越支払資金と一致する。 */
  cashDeposits: number;
}

export interface UniversityFinance {
  id: string;
  name: string;
  corporation: string;
  unit: "円";
  source: string;
  sourceUrl: string;
  years: FinanceYear[];
}

export const UNIVERSITIES = [
  { id: "tamabi", file: "tamabi.json", name: "多摩美術大学" },
  { id: "musabi", file: "musabi.json", name: "武蔵野美術大学" },
] as const;

export type UniversityId = (typeof UNIVERSITIES)[number]["id"];

export function universityById(id: string | null): (typeof UNIVERSITIES)[number] | null {
  const key = id ?? "tamabi";
  return UNIVERSITIES.find((school) => school.id === key) ?? null;
}
