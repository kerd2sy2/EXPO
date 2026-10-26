import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustodyAndroidWidget } from './CustodyAndroidWidget';
import { CustodyWidgetProps, DEFAULT_CUSTODY_WIDGET_PROPS } from './CustodyWidgetProps';

const STORAGE_KEY = '@custody_widget_data';

async function getStoredWidgetData(): Promise<CustodyWidgetProps> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const netBal = parsed.netBalance ?? parsed.branches?.[0]?.netBalance;
        if (netBal !== undefined && netBal !== 0) {
          return parsed as CustodyWidgetProps;
        }
      }
    }
  } catch (err) {
    console.warn('[CustodyWidget] Failed to read cached widget data:', err);
  }

  // Fallback: If @custody_widget_data is missing or 0, attempt to restore from app days cache
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const daysCacheKeys = allKeys.filter((k) => k.startsWith('aams_custody_days_cache_'));
    for (const key of daysCacheKeys) {
      const daysRaw = await AsyncStorage.getItem(key);
      if (daysRaw) {
        const daysList = JSON.parse(daysRaw);
        if (Array.isArray(daysList) && daysList.length > 0) {
          const sorted = [...daysList].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          const dayWithBal =
            sorted.find(
              (d) =>
                (d.closing_balance !== undefined && d.closing_balance !== 0) ||
                (d.opening_balance !== undefined && d.opening_balance !== 0)
            ) || sorted[0];

          if (dayWithBal) {
            const avail = (dayWithBal.opening_balance ?? 0) + (dayWithBal.added_amount ?? 0);
            const exp = dayWithBal.total_expenses ?? 0;
            const bal =
              dayWithBal.closing_balance !== undefined &&
              dayWithBal.closing_balance !== null &&
              dayWithBal.closing_balance !== 0
                ? dayWithBal.closing_balance
                : avail - exp;

            const branchName = dayWithBal.branch_name || 'الفرع الأول';
            const bId = dayWithBal.branch_id || 'default';

            return {
              ...DEFAULT_CUSTODY_WIDGET_PROPS,
              branchName,
              netBalance: bal,
              expenses: exp,
              openingBalance: dayWithBal.opening_balance ?? 0,
              netBalanceFormatted: bal.toLocaleString(),
              expensesFormatted: exp.toLocaleString(),
              branches: [
                {
                  branchId: bId,
                  branchName,
                  netBalance: bal,
                  expenses: exp,
                  openingBalance: dayWithBal.opening_balance ?? 0,
                  netBalanceFormatted: bal.toLocaleString(),
                  expensesFormatted: exp.toLocaleString(),
                  progressRatio: avail > 0 ? Math.min(1, exp / avail) : 0,
                },
              ],
            };
          }
        }
      }
    }
  } catch (_) {}

  return DEFAULT_CUSTODY_WIDGET_PROPS;
}

async function saveWidgetData(data: CustodyWidgetProps): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[CustodyWidget] Failed to save widget data:', err);
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction } = props;

  let data = await getStoredWidgetData();
  const branches =
    data.branches && data.branches.length > 0 ? data.branches : DEFAULT_CUSTODY_WIDGET_PROPS.branches;
  let activeIdx = data.activeBranchIndex ?? 0;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      break;

    case 'WIDGET_CLICK':
      if (clickAction === 'SWITCH_BRANCH_NEXT') {
        activeIdx = (activeIdx + 1) % branches.length;
        data = { ...data, activeBranchIndex: activeIdx };
        await saveWidgetData(data);
        props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      } else if (clickAction === 'SWITCH_BRANCH_PREV') {
        activeIdx = (activeIdx - 1 + branches.length) % branches.length;
        data = { ...data, activeBranchIndex: activeIdx };
        await saveWidgetData(data);
        props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      } else if (clickAction === 'SWITCH_DAY_PREV') {
        const days = data.daysList && data.daysList.length > 0 ? data.daysList : [];
        if (days.length > 1) {
          const currentDayIdx = data.activeDayIndex ?? 0;
          const nextDayIdx = Math.min(currentDayIdx + 1, days.length - 1);
          const day = days[nextDayIdx];
          data = {
            ...data,
            activeDayIndex: nextDayIdx,
            dateLabel: day.dateLabel,
            date: day.dateLabel,
            netBalance: day.netBalance,
            expenses: day.expenses,
            openingBalance: day.openingBalance,
            netBalanceFormatted: day.netBalanceFormatted,
            expensesFormatted: day.expensesFormatted,
            progressRatio: day.progressRatio,
          };
          await saveWidgetData(data);
          props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
        }
      } else if (clickAction === 'SWITCH_DAY_NEXT') {
        const days = data.daysList && data.daysList.length > 0 ? data.daysList : [];
        if (days.length > 1) {
          const currentDayIdx = data.activeDayIndex ?? 0;
          const nextDayIdx = Math.max(currentDayIdx - 1, 0);
          const day = days[nextDayIdx];
          data = {
            ...data,
            activeDayIndex: nextDayIdx,
            dateLabel: day.dateLabel,
            date: day.dateLabel,
            netBalance: day.netBalance,
            expenses: day.expenses,
            openingBalance: day.openingBalance,
            netBalanceFormatted: day.netBalanceFormatted,
            expensesFormatted: day.expensesFormatted,
            progressRatio: day.progressRatio,
          };
          await saveWidgetData(data);
          props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
        }
      }
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      props.renderWidget(<CustodyAndroidWidget {...data} activeBranchIndex={activeIdx} />);
      break;
  }
}
