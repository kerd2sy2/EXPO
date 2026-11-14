import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkSession, TabType, Language, ThemeColors } from '../../types/delegate';

interface DelegateSubPageHeaderProps {
  currentTab: TabType;
  activeSession: WorkSession | null;
  selectedHistoryMonthKey: string | null;
  selectedHistoryMonthLabel: string | null;
  setSelectedHistoryMonthKey: (key: string | null) => void;
  setSelectedHistoryMonthLabel: (label: string | null) => void;
  setCurrentTab: (tab: TabType) => void;
  topInset: number;
  isRTL: boolean;
  lang: Language;
  colors: ThemeColors;
  t: any;
}

export const DelegateSubPageHeader: React.FC<DelegateSubPageHeaderProps> = React.memo(({
  currentTab,
  activeSession,
  selectedHistoryMonthKey,
  selectedHistoryMonthLabel,
  setSelectedHistoryMonthKey,
  setSelectedHistoryMonthLabel,
  setCurrentTab,
  topInset,
  isRTL,
  lang,
  colors,
  t,
}) => {
  const titleText =
    currentTab === 'shift'
      ? activeSession
        ? t.endShiftTitle
        : t.startShiftTitle
      : currentTab === 'history'
      ? selectedHistoryMonthLabel
        ? lang === 'ar'
          ? `طلبات شهر ${selectedHistoryMonthLabel}`
          : lang === 'ur'
          ? `${selectedHistoryMonthLabel} کے آرڈرز`
          : lang === 'bn'
          ? `${selectedHistoryMonthLabel} এর অর্ডারসমূহ`
          : `${selectedHistoryMonthLabel} Orders`
        : t.historyTitle
      : currentTab === 'violations'
      ? t.violationsTitle || 'سجل المخالفات والجزاءات'
      : currentTab === 'oil-change'
      ? t.oilChangeScreenTitle || (lang === 'ar' ? 'صفحة تغيير الزيت' : 'Oil Change Page')
      : t.profileTitle;

  return (
    <View style={[styles.appHeader, { marginTop: topInset, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => {
            if (currentTab === 'history' && selectedHistoryMonthKey) {
              setSelectedHistoryMonthKey(null);
              setSelectedHistoryMonthLabel(null);
            } else {
              setCurrentTab('home');
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={[styles.subPageTitleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            {titleText}
          </Text>
          <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
        </View>
      </View>
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
