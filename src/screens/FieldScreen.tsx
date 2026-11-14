import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { DelegateWithStatus } from '../services/supervisor';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { fieldStyles as styles } from './field/fieldStyles';
import { FieldFilter, filterAndSortFieldDelegates } from './field/fieldHelpers';
import { FieldDelegateCard } from './field/FieldDelegateCard';
import { FieldOverrideModal } from './field/FieldOverrideModal';

interface FieldScreenProps {
  delegates: DelegateWithStatus[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onOverrideSuccess: (employeeId?: string, wasStart?: boolean) => void;
}

export const FieldScreen: React.FC<FieldScreenProps> = React.memo(({
  delegates,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onOverrideSuccess,
}) => {
  const [filter, setFilter] = useState<FieldFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [overrideMode, setOverrideMode] = useState<'start' | 'end' | null>(null);

  const [overrideEndedIds, setOverrideEndedIds] = useState<Set<string>>(new Set());
  const [overrideStartedIds, setOverrideStartedIds] = useState<Set<string>>(new Set());

  const isDelegateActuallyWorking = useCallback(
    (d: DelegateWithStatus) => {
      const id = String(d.id);
      if (overrideEndedIds.has(id)) return false;
      if (overrideStartedIds.has(id)) return true;
      return Boolean(d.is_working);
    },
    [overrideEndedIds, overrideStartedIds]
  );

  const counts = useMemo(() => {
    const working = delegates.filter(isDelegateActuallyWorking).length;
    const finished = delegates.filter((d) => !isDelegateActuallyWorking(d) && Boolean(d.finished_today)).length;
    const today = working + finished;
    return { today, working, finished };
  }, [delegates, isDelegateActuallyWorking]);

  const filteredDelegates = useMemo(
    () => filterAndSortFieldDelegates(delegates, filter, searchQuery, isDelegateActuallyWorking),
    [delegates, filter, searchQuery, isDelegateActuallyWorking]
  );

  const openOverride = useCallback((d: DelegateWithStatus, mode: 'start' | 'end') => {
    setSelectedDelegate(d);
    setOverrideMode(mode);
  }, []);

  const handleCall = useCallback((phone?: string) => {
    if (!phone) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه',
        message: 'لا يوجد رقم جوال مسجل لهذا المندوب.',
      });
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {});
  }, []);

  const handleWhatsApp = useCallback((phone?: string) => {
    if (!phone) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه',
        message: 'لا يوجد رقم جوال مسجل لهذا المندوب.',
      });
      return;
    }
    const cleanPhone = toEnglishDigits(phone).replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('05')
      ? `966${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('5')
      ? `966${cleanPhone}`
      : cleanPhone;
    Linking.openURL(`https://wa.me/${intlPhone}`).catch(() => {});
  }, []);

  const handleOverrideCompleted = useCallback(
    (targetEmpId: string, _dName: string, wasStart: boolean) => {
      if (wasStart) {
        setOverrideStartedIds((prev) => new Set(prev).add(targetEmpId));
        setOverrideEndedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetEmpId);
          return next;
        });
      } else {
        setOverrideEndedIds((prev) => new Set(prev).add(targetEmpId));
        setOverrideStartedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetEmpId);
          return next;
        });
      }

      setSelectedDelegate(null);
      setOverrideMode(null);
      onOverrideSuccess(targetEmpId, wasStart);
    },
    [onOverrideSuccess]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Filter Tabs & Search */}
      <ModuleErrorBoundary moduleName="شريط فلترة الميدان" colors={colors}>
        <View style={styles.topArea}>
          <View style={[styles.tabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.tabChip,
                {
                  backgroundColor: filter === 'today' ? colors.primary : colors.card,
                  borderColor: filter === 'today' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter('today')}
            >
              <Text style={[styles.tabNum, { color: filter === 'today' ? '#fff' : colors.primary }]}>
                {counts.today}
              </Text>
              <Text
                style={[
                  styles.tabLbl,
                  { color: filter === 'today' ? '#e0f2fe' : colors.textSecondary },
                ]}
              >
                مناديب اليوم
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabChip,
                {
                  backgroundColor: filter === 'working' ? '#10b981' : colors.card,
                  borderColor: filter === 'working' ? '#10b981' : colors.border,
                },
              ]}
              onPress={() => setFilter('working')}
            >
              <Text style={[styles.tabNum, { color: filter === 'working' ? '#fff' : '#10b981' }]}>
                {counts.working}
              </Text>
              <Text
                style={[
                  styles.tabLbl,
                  { color: filter === 'working' ? '#d1fae5' : colors.textSecondary },
                ]}
              >
                يعملون الآن
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabChip,
                {
                  backgroundColor: filter === 'finished' ? '#f59e0b' : colors.card,
                  borderColor: filter === 'finished' ? '#f59e0b' : colors.border,
                },
              ]}
              onPress={() => setFilter('finished')}
            >
              <Text
                style={[styles.tabNum, { color: filter === 'finished' ? '#fff' : '#f59e0b' }]}
              >
                {counts.finished}
              </Text>
              <Text
                style={[
                  styles.tabLbl,
                  { color: filter === 'finished' ? '#fef3c7' : colors.textSecondary },
                ]}
              >
                أنهوا الشفت
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
            <TextInput
              style={[
                styles.searchInput,
                { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
              ]}
              placeholder="ابحث برقم المفتاح، اسم المندوب، أو رقم اللوحة..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="قائمة الميدان" colors={colors} onReset={onRefresh}>
        <FlatList
          data={filteredDelegates}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ModuleErrorBoundary moduleName={`بطاقة ${item.name || 'مندوب'}`} colors={colors}>
              <FieldDelegateCard
                delegate={item}
                isWorking={isDelegateActuallyWorking(item)}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onOpenOverride={openOverride}
              />
            </ModuleErrorBoundary>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="bicycle-outline" size={44} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery.trim()
                  ? 'لا يوجد مناديب مطابقون للبحث'
                  : filter === 'working'
                  ? 'لا يوجد مناديب يعملون الآن'
                  : filter === 'finished'
                  ? 'لا يوجد مناديب أنهوا الشفت اليوم'
                  : 'لا يوجد مناديب سجلوا حضورهم اليوم'}
              </Text>
            </View>
          }
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="نافذة التدخل الميداني"
        colors={colors}
        onReset={() => {
          setSelectedDelegate(null);
          setOverrideMode(null);
        }}
      >
        <FieldOverrideModal
          delegate={selectedDelegate}
          mode={overrideMode}
          colors={colors}
          isRTL={isRTL}
          onClose={() => {
            setSelectedDelegate(null);
            setOverrideMode(null);
          }}
          onSuccess={handleOverrideCompleted}
        />
      </ModuleErrorBoundary>
    </View>
  );
});
