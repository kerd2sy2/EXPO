import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { widgetsDirectory } from 'expo-widgets';
import CustodyWidget from './CustodyWidget';
import { BranchCustodyItem, CustodyWidgetProps } from './CustodyWidgetProps';
import { formatArabicNumber } from '../utils/formatters';
import { CustodyDayData } from '../services/custodyService';

let cachedSymbolPath: string | null = null;

/**
 * Ensures the Saudi Riyal symbol PNG image is placed inside `widgetsDirectory`
 * so native widgets on Android and iOS can load it reliably.
 */
async function ensureRiyalSymbolAsset(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (cachedSymbolPath) return cachedSymbolPath;

  try {
    if (!widgetsDirectory) return null;

    const targetPath = `${widgetsDirectory}/saudi_riyal_symbol.png`;
    const fileInfo = await FileSystem.getInfoAsync(targetPath);
    if (fileInfo.exists) {
      cachedSymbolPath = targetPath;
      return targetPath;
    }

    if (FileSystem.documentDirectory) {
      const localDocPath = `${FileSystem.documentDirectory}Saudi_Riyal_Symbol.png`;
      const docInfo = await FileSystem.getInfoAsync(localDocPath);
      if (docInfo.exists) {
        await FileSystem.copyAsync({ from: localDocPath, to: targetPath });
        cachedSymbolPath = targetPath;
        return targetPath;
      }
    }
  } catch (err) {
    // Fallback to stylized text symbol
  }
  return null;
}

export interface SyncWidgetParams {
  currentDay: CustodyDayData | null;
  effectiveOpeningBalance: number;
  activeBranch: { id: string; name: string };
  allBranches?: Array<{ id: string; name: string }>;
  allDays?: CustodyDayData[];
  dateLabel?: string;
}

/**
 * Synchronizes the custody state to the home screen widget across Android & iOS.
 */
export async function syncCustodyWidget(params: SyncWidgetParams): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const symbolPath = await ensureRiyalSymbolAsset();

    const {
      currentDay,
      effectiveOpeningBalance,
      activeBranch,
      allBranches = [],
      allDays = [],
      dateLabel = 'اليوم',
    } = params;

    // 1. Calculate active branch metrics
    const totalAvail = effectiveOpeningBalance + (currentDay?.added_amount ?? 0);
    const totalExp = currentDay?.total_expenses ?? 0;
    const closingBal =
      currentDay?.closing_balance !== undefined &&
      currentDay?.closing_balance !== null &&
      currentDay.closing_balance !== 0
        ? currentDay.closing_balance
        : totalAvail - totalExp;

    const activeRatio = totalAvail > 0 ? Math.min(1, Math.max(0, totalExp / totalAvail)) : 0;

    // 2. Build multi-branch items list
    const branchItems: BranchCustodyItem[] = [];

    if (allBranches.length > 0) {
      for (const b of allBranches) {
        if (b.id === activeBranch.id) {
          branchItems.push({
            branchId: b.id,
            branchName: b.name,
            netBalanceFormatted: formatArabicNumber(closingBal, 2),
            expensesFormatted: formatArabicNumber(totalExp, 2),
            progressRatio: activeRatio,
          });
        } else {
          const bDay = allDays.find((d: any) => d.branch_id === b.id);
          const bAvail = (bDay?.opening_balance ?? 0) + (bDay?.added_amount ?? 0);
          const bExp = bDay?.total_expenses ?? 0;
          const bClose =
            bDay?.closing_balance !== undefined && bDay?.closing_balance !== null && bDay.closing_balance !== 0
              ? bDay.closing_balance
              : bAvail - bExp;
          const bRatio = bAvail > 0 ? Math.min(1, Math.max(0, bExp / bAvail)) : 0;

          branchItems.push({
            branchId: b.id,
            branchName: b.name,
            netBalanceFormatted: formatArabicNumber(bClose, 2),
            expensesFormatted: formatArabicNumber(bExp, 2),
            progressRatio: bRatio,
          });
        }
      }
    } else {
      branchItems.push({
        branchId: activeBranch.id || 'default',
        branchName: activeBranch.name || 'الفرع الأول',
        netBalanceFormatted: formatArabicNumber(closingBal, 2),
        expensesFormatted: formatArabicNumber(totalExp, 2),
        progressRatio: activeRatio,
      });
    }

    const activeIdx = Math.max(
      0,
      branchItems.findIndex((b) => b.branchId === activeBranch.id)
    );

    const activeItem = branchItems[activeIdx] || branchItems[0];

    const snapshotProps: CustodyWidgetProps = {
      branches: branchItems,
      activeBranchIndex: activeIdx,
      dateLabel,
      branchName: activeItem.branchName,
      netBalanceFormatted: activeItem.netBalanceFormatted,
      expensesFormatted: activeItem.expensesFormatted,
      progressRatio: activeItem.progressRatio,
      totalBranches: branchItems.length,
      hasSymbolImage: !!symbolPath,
      symbolImagePath: symbolPath || undefined,
    };

    if (CustodyWidget && typeof CustodyWidget.updateSnapshot === 'function') {
      CustodyWidget.updateSnapshot(snapshotProps);
    }
  } catch (err) {
    console.warn('CustodyWidget sync notice:', err);
  }
}
