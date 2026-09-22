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

export const UNIVERSITY_ID = "tamabi";
