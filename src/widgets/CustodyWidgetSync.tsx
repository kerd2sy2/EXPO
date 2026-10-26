import React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { widgetsDirectory } from 'expo-widgets';
import CustodyWidget from './CustodyWidget';
import { BranchCustodyItem, CustodyWidgetProps } from './CustodyWidgetProps';
import { formatArabicNumber } from '../utils/formatters';
import { CustodyDayData } from '../services/custodyService';
import { CustodyAndroidWidget } from './CustodyAndroidWidget';

let cachedSymbolPath: string | null = null;
const STORAGE_KEY = '@custody_widget_data';

/**
 * Ensures the Saudi Riyal symbol PNG image is placed inside `widgetsDirectory`
 * for iOS widgets.
 */
async function ensureRiyalSymbolAsset(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
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
    // Fallback
  }
  return null;
}

export interface SyncWidgetParams {
  currentDay: CustodyDayData | null;
  effectiveOpeningBalance: number;
  activeBranch: { id: string | null; name: string };
  allBranches?: { id: string; name: string }[];
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
    let closingBal =
      currentDay?.closing_balance !== undefined &&
      currentDay?.closing_balance !== null &&
      currentDay.closing_balance !== 0
        ? currentDay.closing_balance
        : totalAvail - totalExp;

    // Fallback: If closing balance is 0 and currentDay has no custody added, check previous days
    if (
      closingBal === 0 &&
      (!currentDay || (currentDay.closing_balance === 0 && (currentDay.added_amount ?? 0) === 0))
    ) {
      if (allDays && allDays.length > 0) {
        const sorted = [...allDays].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const lastWithBal = sorted.find(
          (d) =>
            (d.closing_balance !== undefined && d.closing_balance !== 0) ||
            (d.opening_balance !== undefined && d.opening_balance !== 0)
        );
        if (lastWithBal) {
          const avail = (lastWithBal.opening_balance ?? 0) + (lastWithBal.added_amount ?? 0);
          const exp = lastWithBal.total_expenses ?? 0;
          closingBal =
            lastWithBal.closing_balance !== undefined &&
            lastWithBal.closing_balance !== null &&
            lastWithBal.closing_balance !== 0
              ? lastWithBal.closing_balance
              : avail - exp;
        }
      }
    }

    const activeRatio = totalAvail > 0 ? Math.min(1, Math.max(0, totalExp / totalAvail)) : 0;

    // 2. Build multi-branch items list
    const branchItems: BranchCustodyItem[] = [];
    const activeBranchIdStr = String(activeBranch?.id || '').trim();

    if (allBranches.length > 0) {
      for (const b of allBranches) {
        const isCurrentActive =
          (activeBranchIdStr && String(b.id || '').trim() === activeBranchIdStr) ||
          b.id === activeBranch.id;

        if (isCurrentActive) {
          branchItems.push({
            branchId: b.id,
            branchName: b.name,
            netBalance: closingBal,
            expenses: totalExp,
            openingBalance: effectiveOpeningBalance,
            netBalanceFormatted: formatArabicNumber(closingBal, 2),
            expensesFormatted: formatArabicNumber(totalExp, 2),
            progressRatio: activeRatio,
          });
        } else {
          const bDay = allDays.find((d: any) => String(d.branch_id || '').trim() === String(b.id || '').trim());
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
            netBalance: bClose,
            expenses: bExp,
            openingBalance: bDay?.opening_balance ?? 0,
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
        netBalance: closingBal,
        expenses: totalExp,
        openingBalance: effectiveOpeningBalance,
        netBalanceFormatted: formatArabicNumber(closingBal, 2),
        expensesFormatted: formatArabicNumber(totalExp, 2),
        progressRatio: activeRatio,
      });
    }

    const activeIdx = Math.max(
      0,
      branchItems.findIndex((b) => String(b.branchId || '').trim() === activeBranchIdStr)
    );

    const activeItem = branchItems[activeIdx] || branchItems[0];

    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;

    const snapshotProps: CustodyWidgetProps = {
      branches: branchItems,
      activeBranchIndex: activeIdx,
      dateLabel,
      date: dateLabel,
      lastUpdated: timeStr,
      branchName: activeItem?.branchName || activeBranch?.name || 'الفرع الأول',
      netBalance: activeItem?.netBalance ?? closingBal,
      expenses: activeItem?.expenses ?? totalExp,
      openingBalance: activeItem?.openingBalance ?? effectiveOpeningBalance,
      netBalanceFormatted: activeItem?.netBalanceFormatted || formatArabicNumber(closingBal, 2),
      expensesFormatted: activeItem?.expensesFormatted || formatArabicNumber(totalExp, 2),
      progressRatio: activeItem?.progressRatio ?? activeRatio,
      totalBranches: branchItems.length,
      hasSymbolImage: !!symbolPath,
      symbolImagePath: symbolPath || undefined,
    };

    // Save to persistent storage so the widget handler can load it offline/in background
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotProps));

    // Update Android Home Screen Widget via react-native-android-widget
    if (Platform.OS === 'android') {
      try {
        const { requestWidgetUpdate } = require('react-native-android-widget');
        await requestWidgetUpdate({
          widgetName: 'CustodyWidget',
          renderWidget: () => <CustodyAndroidWidget {...snapshotProps} />,
          widgetNotFound: () => {
            // Widget not yet added to home screen
          },
        });
      } catch (androidErr) {
        console.warn('[CustodyWidget] Android widget update notice:', androidErr);
      }
    }

    // Update iOS Home Screen Widget via expo-widgets
    if (Platform.OS === 'ios' && CustodyWidget && typeof CustodyWidget.updateSnapshot === 'function') {
      CustodyWidget.updateSnapshot(snapshotProps);
    }
  } catch (err) {
    console.warn('[CustodyWidget] sync notice:', err);
  }
}

/**
 * Prompts the user to pin the Custody Widget directly to the Android home screen.
 */
export async function pinCustodyWidget(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { requestPinWidget } = require('react-native-android-widget');
    return await requestPinWidget({ widgetName: 'CustodyWidget' });
  } catch (err) {
    console.warn('[CustodyWidget] pin notice:', err);
    return false;
  }
}
