export interface BranchCustodyItem {
  branchId: string;
  branchName: string;
  netBalanceFormatted: string;
  expensesFormatted: string;
  progressRatio: number;
}

export interface CustodyWidgetProps {
  branches: BranchCustodyItem[];
  activeBranchIndex: number;
  dateLabel: string;
  branchName: string;
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
      netBalanceFormatted: '٠.٠٠',
      expensesFormatted: '٠.٠٠',
      progressRatio: 0,
    },
  ],
  activeBranchIndex: 0,
  dateLabel: 'اليوم',
  branchName: 'الفرع الأول',
  netBalanceFormatted: '٠.٠٠',
  expensesFormatted: '٠.٠٠',
  progressRatio: 0,
  totalBranches: 1,
  hasSymbolImage: false,
};
