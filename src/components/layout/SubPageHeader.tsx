import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabType, ThemeColors } from '../../types/delegate';

interface SubPageHeaderProps {
  currentTab: TabType;
  colors: ThemeColors;
  isRTL: boolean;
  onBack: () => void;
  activeSession: any;
  selectedHistoryMonthLabel?: string;
  lang: string;
  t: any;
  onOpenOrdersDatePicker?: () => void;
  onNotifMarkAll?: () => void;
  onNotifClearModal?: () => void;
}

export const SubPageHeader: React.FC<SubPageHeaderProps> = React.memo(({
  currentTab,
  colors,
  isRTL,
  onBack,
  activeSession,
  selectedHistoryMonthLabel,
  lang,
  t,
  onOpenOrdersDatePicker,
  onNotifMarkAll,
  onNotifClearModal,
}) => {
  const getTitle = () => {
    switch (currentTab) {
      case 'notifications':
        return 'مركز الإشعارات';
      case 'dashboard':
      case 'home':
        return 'لوحة مؤشرات الفرع';
      case 'field':
        return 'متابعة الميدان والورديات';
      case 'approvals':
        return 'مركز الموافقات';
      case 'operations':
        return 'المخزن والعمليات';
      case 'oil-change':
        return 'الدبابات المستحقة لتغيير الزيت';
      case 'fleet-oil':
        return 'متابعة زيوت الدبابات';
      case 'add-vehicle':
        return 'إضافة مركبة جديدة';
      case 'accident-report':
        return 'بلاغ عن حادث';
      case 'supervisor-report':
        return 'تقرير مشرف';
      case 'advance-request':
        return 'سلفة';
      case 'employees':
        return 'إدارة وتعديل الموظفين';
      case 'orders-review':
        return 'مراجعة الطلبات';
      case 'shift':
        return activeSession ? t.endShiftTitle : t.startShiftTitle;
      case 'history':
        if (selectedHistoryMonthLabel) {
          if (lang === 'ar') return `طلبات شهر ${selectedHistoryMonthLabel}`;
          if (lang === 'ur') return `${selectedHistoryMonthLabel} کے آرڈرز`;
          if (lang === 'bn') return `${selectedHistoryMonthLabel} এর অর্ডারসমূহ`;
          return `${selectedHistoryMonthLabel} Orders`;
        }
        return t.historyTitle;
      case 'violations':
        return t.violationsTitle || 'سجل المخالفات والجزاءات';
      default:
        return t.profileTitle;
    }
  };

  return (
    <View style={[styles.appHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={[styles.subPageTitleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            {getTitle()}
          </Text>
          <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
        </View>
      </View>

      {currentTab === 'orders-review' && onOpenOrdersDatePicker && (
        <TouchableOpacity
          style={[styles.headerCalendarBtn, { backgroundColor: colors.primaryLight }]}
          onPress={onOpenOrdersDatePicker}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}

      {currentTab === 'notifications' && (
        <TouchableOpacity
          style={[
            styles.headerCalendarBtn,
            {
              backgroundColor: colors.primary + '18',
              borderRadius: 12,
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          onPress={onNotifMarkAll}
          onLongPress={onNotifClearModal}
          delayLongPress={450}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done-circle-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  appHeader: {
    minHeight: 72,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPageHeaderRow: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  headerCalendarBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subPageTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleUnderlineBar: {
    width: 34,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
});
