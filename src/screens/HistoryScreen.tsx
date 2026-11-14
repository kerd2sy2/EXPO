import React, { useState, useMemo } from 'react';
import { View, LayoutAnimation, Platform, UIManager } from 'react-native';
import { WorkSession, PreviewPhotoData, ThemeColors, Language } from '../types/delegate';
import { ShiftDetailsModal } from '../components/modals/ShiftDetailsModal';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { buildMonthGroups, getCurrentMonthInfo } from './history/historyHelpers';
import { historyStyles as styles } from './history/historyStyles';
import { HistoryMonthShiftsView } from './history/HistoryMonthShiftsView';
import { HistoryMonthsListView } from './history/HistoryMonthsListView';

export { getCurrentMonthInfo };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HistoryScreenProps {
  historySessions: WorkSession[];
  loading?: boolean;
  selectedSession?: WorkSession | null;
  onSelectSession?: (session: WorkSession | null) => void;
  selectedMonthKey?: string | null;
  onSelectMonthKey?: (key: string | null, label: string | null) => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  formatDateStr: (iso?: string) => string;
  formatTimeStr: (iso?: string) => string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang?: Language;
  monthlyTarget?: number;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  historySessions,
  selectedSession,
  onSelectSession,
  selectedMonthKey: controlledMonthKey,
  onSelectMonthKey: controlledSetMonthKey,
  onPreviewPhoto,
  formatDateStr,
  formatTimeStr,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang = 'ar',
}) => {
  const [internalSelectedSession, setInternalSelectedSession] = useState<WorkSession | null>(null);
  const activeSelected = selectedSession !== undefined ? selectedSession : internalSelectedSession;
  const setActiveSelected = onSelectSession || setInternalSelectedSession;

  const [internalMonthKey, setInternalMonthKey] = useState<string | null>(null);
  const selectedMonthKey = controlledMonthKey !== undefined ? controlledMonthKey : internalMonthKey;

  const setMonthKey = (key: string | null, label: string | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (controlledSetMonthKey) {
      controlledSetMonthKey(key, label);
    } else {
      setInternalMonthKey(key);
    }
  };

  const monthGroups = useMemo(
    () => buildMonthGroups(historySessions, lang),
    [historySessions, lang]
  );

  const activeMonthGroup = useMemo(() => {
    if (!selectedMonthKey) return null;
    return monthGroups.find((g) => g.key === selectedMonthKey) || null;
  }, [monthGroups, selectedMonthKey]);

  return (
    <View style={styles.tabContainer}>
      <ModuleErrorBoundary
        moduleName={activeMonthGroup ? 'تفاصيل شفتات الشهر' : 'سجل الشهور'}
        colors={colors}
      >
        {activeMonthGroup ? (
          <HistoryMonthShiftsView
            monthGroup={activeMonthGroup}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
            lang={lang}
            formatDateStr={formatDateStr}
            formatTimeStr={formatTimeStr}
            onSelectSession={setActiveSelected}
          />
        ) : (
          <HistoryMonthsListView
            monthGroups={monthGroups}
            colors={colors}
            isRTL={isRTL}
            t={t}
            lang={lang}
            onSelectMonth={setMonthKey}
          />
        )}
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="نافذة تفاصيل الشفت"
        colors={colors}
        onReset={() => setActiveSelected(null)}
      >
        <ShiftDetailsModal
          visible={Boolean(activeSelected)}
          session={activeSelected}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          lang={lang}
          onClose={() => setActiveSelected(null)}
          onPreviewPhoto={onPreviewPhoto}
          formatDateStr={formatDateStr}
          formatTimeStr={formatTimeStr}
        />
      </ModuleErrorBoundary>
    </View>
  );
};
