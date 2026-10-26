export interface BranchCustodyItem {
  branchId: string;
  branchName: string;
  netBalance?: number;
  expenses?: number;
  openingBalance?: number;
  netBalanceFormatted: string;
  expensesFormatted: string;
  progressRatio: number;
}

export interface DayCustodyItem {
  date: string;
  dateLabel: string;
  netBalance: number;
  expenses: number;
  openingBalance: number;
  netBalanceFormatted: string;
  expensesFormatted: string;
  progressRatio: number;
}

export interface CustodyWidgetProps {
  branches: BranchCustodyItem[];
  activeBranchIndex: number;
  daysList?: DayCustodyItem[];
  activeDayIndex?: number;
  dateLabel: string;
  date?: string;
  lastUpdated?: string;
  branchName: string;
  netBalance?: number;
  expenses?: number;
  openingBalance?: number;
  netBalanceFormatted: string;
  expensesFormatted: string;
  progressRatio: number;
  totalBranches: number;
  hasSymbolImage: boolean;
  symbolImagePath?: string;
}

export const DEFAULT_CUSTODY_WIDGET_PROPS: CustodyWidgetProps = {
  branches: [
    {
      branchId: 'default',
      branchName: 'الفرع الأول',
      netBalance: 0,
      expenses: 0,
      openingBalance: 0,
      netBalanceFormatted: '0.00',
      expensesFormatted: '0.00',
      progressRatio: 0,
    },
  ],
  activeBranchIndex: 0,
  dateLabel: 'اليوم',
  date: 'اليوم',
  lastUpdated: 'الآن',
  branchName: 'الفرع الأول',
  netBalance: 0,
  expenses: 0,
  openingBalance: 0,
  netBalanceFormatted: '0.00',
  expensesFormatted: '0.00',
  progressRatio: 0,
  totalBranches: 1,
  hasSymbolImage: true,
};
