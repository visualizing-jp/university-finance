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

export const REGIONS = [
  { id: "kanto", name: "関東" },
  { id: "kansai", name: "関西" },
] as const;

export type Region = (typeof REGIONS)[number]["id"];

export const UNIVERSITIES: ReadonlyArray<{
  id: string;
  file: string;
  name: string;
  region: Region;
}> = [
  { id: "tamabi", file: "tamabi.json", name: "多摩美術大学", region: "kanto" },
  { id: "musabi", file: "musabi.json", name: "武蔵野美術大学", region: "kanto" },
  { id: "zokei", file: "zokei.json", name: "東京造形大学", region: "kanto" },
  { id: "joshibi", file: "joshibi.json", name: "女子美術大学", region: "kanto" },
  { id: "seika", file: "seika.json", name: "京都精華大学", region: "kansai" },
  { id: "seian", file: "seian.json", name: "成安造形大学", region: "kansai" },
];

/** どの地域にも大学があるときだけ、地域で絞るスイッチを出す。 */
export const REGION_FILTER = REGIONS.every((region) =>
  UNIVERSITIES.some((school) => school.region === region.id),
);

export function inRegion(id: string, region: Region | null): boolean {
  if (region == null) return true;
  return universityById(id)?.region === region;
}

export function universityById(id: string | null): (typeof UNIVERSITIES)[number] | null {
  if (id == null) return null;
  return UNIVERSITIES.find((school) => school.id === id) ?? null;
}
