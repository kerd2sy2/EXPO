import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus, supervisorApi } from '../../services/supervisor';
import { targetApi } from '../../services/targetApi';
import { IdentifierPerformance } from '../../types/target';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { showBottomAlert } from '../../components/modals/ActionAlertBottomSheet';
import { extractKeySortValue } from '../EmployeesScreen';
import { EmployeeIdentifierPickerOverlay } from '../../components/modals/edit-employee/EmployeeIdentifierPickerOverlay';
import { platformDelegatesModalStyles as styles } from './platformDelegatesModalStyles';
import { PlatformDelegateRowCard } from './PlatformDelegateRowCard';
import {
  getPlatformColor,
  getPlatformLabelAr,
  normalizeAndFilterIdentifiers,
  normalizePlatformKey,
  toBackendAppName,
} from '../../components/modals/edit-employee/editEmployeeHelpers';

export type PlatformModalFilter = 'ALL' | 'keeta' | 'ninja' | 'hungerstation' | 'unassigned';

interface PlatformDelegatesModalProps {
  visible: boolean;
  initialPlatformKey: PlatformModalFilter;
  delegates: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const FILTER_TABS: Array<{ key: PlatformModalFilter; label: string }> = [
  { key: 'ALL', label: 'الكل' },
  { key: 'keeta', label: 'كيتا' },
  { key: 'ninja', label: 'نينجا' },
  { key: 'hungerstation', label: 'هنجر' },
  { key: 'unassigned', label: 'غير مربوط' },
];

export const PlatformDelegatesModal: React.FC<PlatformDelegatesModalProps> = ({
  visible,
  initialPlatformKey,
  delegates,
  colors,
  isDarkMode,
  isRTL,
  onClose,
  onRefresh,
}) => {
  const [platformFilter, setPlatformFilter] = useState<PlatformModalFilter>(initialPlatformKey || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [loadingIdents, setLoadingIdents] = useState(false);

  // Optimistic local overrides after long-press user reassignment
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, { application_id: string; application_type: string }>
  >({});

  // Long-press identifier picker state
  const [editingDelegate, setEditingDelegate] = useState<DelegateWithStatus | null>(null);
  const [pickerAppFilter, setPickerAppFilter] = useState<string>('ALL');
  const [pickerSearchText, setPickerSearchText] = useState('');
  const [manualIdInput, setManualIdInput] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  const loadIdentifiers = useCallback(async () => {
    try {
      setLoadingIdents(true);
      const list = await targetApi.listIdentifiers();
      if (Array.isArray(list)) setIdentifiers(list);
    } catch {
    } finally {
      setLoadingIdents(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setPlatformFilter(initialPlatformKey || 'ALL');
      setSearchQuery('');
      setEditingDelegate(null);
      loadIdentifiers();
    }
  }, [visible, initialPlatformKey, loadIdentifiers]);

  const driversList = useMemo(() => {
    return delegates
      .filter((d) => {
        const role = (d.job_role || (d as any).role_name || 'DRIVER').toUpperCase();
        return !role.includes('SUPERVISOR') && !role.includes('ADMIN');
      })
      .map((d) => {
        const ov = localOverrides[String(d.id)];
        return ov ? { ...d, ...ov } : d;
      });
  }, [delegates, localOverrides]);

  const identifierLookup = useMemo(() => {
    const map = new Map<string, { driverName: string; name: string; appKey: string }>();
    identifiers.forEach((it) => {
      const appKey = normalizePlatformKey(it.app_name);
      const codeNorm = toEnglishDigits((it.code || '').trim()).toLowerCase();
      const nameNorm = toEnglishDigits((it.name || '').trim()).toLowerCase();
      const label = (it.driver_name || '').trim() || (it.name || '').trim();
      const entry = { driverName: label, name: it.name || '', appKey };
      if (codeNorm) {
        map.set(`${appKey}_${codeNorm}`, entry);
        map.set(codeNorm, entry);
      }
      if (nameNorm) {
        map.set(`${appKey}_${nameNorm}`, entry);
        map.set(nameNorm, entry);
      }
    });
    return map;
  }, [identifiers]);

  const counts = useMemo(() => {
    const c: Record<PlatformModalFilter, number> = {
      ALL: driversList.length,
      keeta: 0,
      ninja: 0,
      hungerstation: 0,
      unassigned: 0,
    };
    driversList.forEach((d) => {
      const plat = normalizePlatformKey(d.application_type);
      if (plat === 'unassigned' || !(d.application_id || '').trim()) {
        c.unassigned++;
      }
      if (plat !== 'unassigned') {
        c[plat]++;
      }
    });
    return c;
  }, [driversList]);

  const filteredDelegates = useMemo(() => {
    const q = toEnglishDigits(searchQuery.trim()).toLowerCase();
    return driversList
      .filter((d) => {
        const plat = normalizePlatformKey(d.application_type);
        const hasId = Boolean((d.application_id || '').trim());
        if (platformFilter === 'unassigned') {
          if (plat !== 'unassigned' && hasId) return false;
        } else if (platformFilter !== 'ALL') {
          if (plat !== platformFilter) return false;
        }

        if (!q) return true;
        const matchedIdent =
          identifierLookup.get(`${plat}_${toEnglishDigits(d.application_id || '').toLowerCase()}`) ||
          identifierLookup.get(toEnglishDigits(d.application_id || '').toLowerCase());
        return (
          (d.name || '').toLowerCase().includes(q) ||
          toEnglishDigits(d.key_number || '').toLowerCase().includes(q) ||
          toEnglishDigits(d.motorcycle_number || '').toLowerCase().includes(q) ||
          toEnglishDigits(d.application_id || '').toLowerCase().includes(q) ||
          (matchedIdent?.driverName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const kA = extractKeySortValue(a.key_number);
        const kB = extractKeySortValue(b.key_number);
        if (kA !== kB) return kA - kB;
        return (a.name || '').localeCompare(b.name || '', 'ar');
      });
  }, [driversList, platformFilter, searchQuery, identifierLookup]);

  const pickerIdentifiers = useMemo(
    () => normalizeAndFilterIdentifiers(identifiers, pickerAppFilter, pickerSearchText, driversList),
    [identifiers, pickerAppFilter, pickerSearchText, driversList]
  );

  const openUserEditor = useCallback(
    (d: DelegateWithStatus) => {
      const empPlat = normalizePlatformKey(d.application_type);
      const defaultApp =
        platformFilter !== 'ALL' && platformFilter !== 'unassigned'
          ? platformFilter
          : empPlat !== 'unassigned'
          ? empPlat
          : 'ALL';
      setEditingDelegate(d);
      setPickerAppFilter(defaultApp);
      setPickerSearchText('');
      setManualIdInput(d.application_id || '');
    },
    [platformFilter]
  );

  const applyUserUpdate = useCallback(
    async (newAppId: string, newAppType: string, isManualCreate: boolean = false) => {
      if (!editingDelegate || savingAssignment) return;
      const cleanId = toEnglishDigits(newAppId.trim());
      if (!cleanId) {
        showBottomAlert({ type: 'warning', title: 'تنبيه', message: 'يرجى اختيار أو إدخال رقم اليوزر أولاً.' });
        return;
      }

      const normPlat = normalizePlatformKey(newAppType);
      const resolvedAppType =
        normPlat !== 'unassigned'
          ? normPlat
          : normalizePlatformKey(editingDelegate.application_type) !== 'unassigned'
          ? normalizePlatformKey(editingDelegate.application_type)
          : 'hungerstation';

      try {
        setSavingAssignment(true);
        await supervisorApi.updateEmployee(editingDelegate.id, {
          application_id: cleanId,
          application_type: resolvedAppType,
        });

        if (isManualCreate) {
          targetApi
            .createIdentifier({
              name: cleanId,
              code: cleanId,
              app_name: toBackendAppName(resolvedAppType),
            })
            .then(() => loadIdentifiers())
            .catch(() => {});
        }

        setLocalOverrides((prev) => ({
          ...prev,
          [String(editingDelegate.id)]: {
            application_id: cleanId,
            application_type: resolvedAppType,
          },
        }));

        const targetName = editingDelegate.name;
        setEditingDelegate(null);
        onRefresh();
        showBottomAlert({
          type: 'success',
          title: 'تم تحديث اليوزر',
          message: `تم ربط المندوب ${targetName} بيوزر ${getPlatformLabelAr(resolvedAppType)} (#${cleanId})`,
        });
      } catch (err: any) {
        showBottomAlert({
          type: 'error',
          title: 'فشل التحديث',
          message: err?.message || 'تعذر حفظ اليوزر للمندوب.',
        });
      } finally {
        setSavingAssignment(false);
      }
    },
    [editingDelegate, savingAssignment, loadIdentifiers, onRefresh]
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            activeOpacity={0.7}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>توزيع المناديب واليوزرات</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              اضغط ضغطة مطولة على الكرت لتعديل اليوزر المربوط
            </Text>
          </View>
        </View>

        <ModuleErrorBoundary moduleName="قائمة توزيع المناديب" colors={colors} onReset={loadIdentifiers}>
          {/* Filter Chips */}
          <View style={styles.controlsWrap}>
            <View style={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {FILTER_TABS.map((tab) => {
                const active = platformFilter === tab.key;
                const accent =
                  tab.key === 'ALL'
                    ? colors.primary
                    : tab.key === 'unassigned'
                    ? '#64748b'
                    : getPlatformColor(tab.key);
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? accent : colors.card,
                        borderColor: active ? accent : colors.border,
                      },
                    ]}
                    onPress={() => setPlatformFilter(tab.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterNum, { color: active ? '#fff' : accent }]}>
                      {counts[tab.key]}
                    </Text>
                    <Text style={[styles.filterLbl, { color: active ? '#fff' : colors.textSecondary }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="ابحث بالاسم، المفتاح، أو رقم اليوزر..."
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

          {savingAssignment && (
            <View style={[styles.savingBanner, { backgroundColor: colors.primary + '15' }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.savingText, { color: colors.primary }]}>جاري حفظ تعديل اليوزر...</Text>
            </View>
          )}

          <FlatList
            data={filteredDelegates}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: d }) => (
              <PlatformDelegateRowCard
                delegate={d}
                identifierLookup={identifierLookup}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                onLongPress={openUserEditor}
              />
            )}
            ListEmptyComponent={
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                  لا يوجد مناديب ضمن هذا التصنيف
                </Text>
              </View>
            }
          />
        </ModuleErrorBoundary>

        <EmployeeIdentifierPickerOverlay
          visible={Boolean(editingDelegate)}
          loadingIdentifiers={loadingIdents}
          filteredIdentifiers={pickerIdentifiers}
          applicationId={editingDelegate?.application_id || ''}
          modalAppFilter={pickerAppFilter}
          identifierSearchText={pickerSearchText}
          manualIdInput={manualIdInput}
          onChangeAppFilter={setPickerAppFilter}
          onChangeSearch={setPickerSearchText}
          onChangeManual={setManualIdInput}
          onSelectIdentifier={(item) => applyUserUpdate(item.code || item.driverName, item.appKey, false)}
          onApplyManual={(val) => {
            const targetApp =
              pickerAppFilter !== 'ALL' && normalizePlatformKey(pickerAppFilter) !== 'unassigned'
                ? pickerAppFilter
                : editingDelegate?.application_type || 'hungerstation';
            applyUserUpdate(val, targetApp, true);
          }}
          onClose={() => setEditingDelegate(null)}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      </SafeAreaView>
    </Modal>
  );
};
