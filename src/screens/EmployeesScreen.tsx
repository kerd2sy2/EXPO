import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents, toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus, isDeliveryDelegate } from '../services/supervisor';
import { VehicleItem } from '../services/operations';
import { EditEmployeeModal } from '../components/modals/EditEmployeeModal';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';

interface EmployeesScreenProps {
  employees: DelegateWithStatus[];
  vehicles: VehicleItem[];
  loading: boolean;
  onRefresh: () => void;
  onEmployeeUpdated: (updatedEmp?: any) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

type RoleFilter = 'ALL' | 'WORKING' | 'NO_PLATE';

// Helper to extract numeric key value for natural sorting (1, 2, 3, ... 10, 11)
export const extractKeySortValue = (keyStr?: string | null): number => {
  if (!keyStr) return Number.MAX_SAFE_INTEGER;
  const normalized = toEnglishDigits(String(keyStr)).trim();
  if (!normalized) return Number.MAX_SAFE_INTEGER;
  const match = normalized.match(/\d+/);
  if (!match) return Number.MAX_SAFE_INTEGER - 1;
  const num = parseInt(match[0], 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
};

const isDriverOnly = (emp: DelegateWithStatus): boolean => {
  return isDeliveryDelegate(emp);
};

export const EmployeesScreen: React.FC<EmployeesScreenProps> = ({
  employees,
  vehicles,
  loading,
  onRefresh,
  onEmployeeUpdated,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [selectedEmpForEdit, setSelectedEmpForEdit] = useState<DelegateWithStatus | null>(null);

  // Filter & Sort Employees by Key Number Ascending (ترتيب المفاتيح 1, 2, 3...)
  const filteredEmployees = useMemo(() => {
    const q = toEnglishDigits(searchQuery.trim()).toLowerCase();

    const filtered = employees.filter((emp) => {
      // Exclude supervisors and administrators completely from the delegates list
      if (!isDriverOnly(emp)) return false;
      if (roleFilter === 'WORKING' && !emp.is_working) return false;
      if (roleFilter === 'NO_PLATE' && emp.motorcycle_number && emp.motorcycle_number.trim() !== '') return false;

      if (!q) return true;

      const nameMatch = emp.name?.toLowerCase().includes(q);
      const codeMatch = toEnglishDigits(emp.employee_number || '').toLowerCase().includes(q);
      const idMatch = toEnglishDigits(emp.national_id || '').toLowerCase().includes(q);
      const phoneMatch = toEnglishDigits(emp.phone || '').toLowerCase().includes(q);
      const plateMatch = toEnglishDigits(emp.motorcycle_number || '').toLowerCase().includes(q);
      const keyMatch = toEnglishDigits(emp.key_number || '').toLowerCase().includes(q);
      const appIdMatch = toEnglishDigits(emp.application_id || '').toLowerCase().includes(q);

      return nameMatch || codeMatch || idMatch || phoneMatch || plateMatch || keyMatch || appIdMatch;
    });

    return filtered.sort((a, b) => {
      const keyA = extractKeySortValue(a.key_number);
      const keyB = extractKeySortValue(b.key_number);
      if (keyA !== keyB) {
        return keyA - keyB;
      }
      // Tie-breaker: raw key string or name
      const rawKeyA = toEnglishDigits(a.key_number || '');
      const rawKeyB = toEnglishDigits(b.key_number || '');
      if (rawKeyA !== rawKeyB) {
        return rawKeyA.localeCompare(rawKeyB, 'ar');
      }
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
  }, [employees, searchQuery, roleFilter]);

  // Quick Stats
  const stats = useMemo(() => {
    let drivers = 0;
    let working = 0;
    let noPlate = 0;

    employees.forEach((emp) => {
      if (!isDriverOnly(emp)) return;
      drivers++;
      if (emp.is_working) working++;
      if (!emp.motorcycle_number || !emp.motorcycle_number.trim()) noPlate++;
    });

    return { total: drivers, working, noPlate };
  }, [employees]);

  const handleCall = useCallback((phone?: string) => {
    if (!phone) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه',
        message: 'لا يوجد رقم جوال مسجل لهذا الموظف.',
      });
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      showBottomAlert({
        type: 'error',
        title: 'خطأ',
        message: 'تعذر فتح تطبيق الاتصال.',
      });
    });
  }, []);

  const handleWhatsApp = useCallback((phone?: string) => {
    if (!phone) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه',
        message: 'لا يوجد رقم جوال مسجل لهذا الموظف.',
      });
      return;
    }
    const cleanPhone = toEnglishDigits(phone).replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('05')
      ? `966${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('5')
      ? `966${cleanPhone}`
      : cleanPhone;

    Linking.openURL(`https://wa.me/${intlPhone}`).catch(() => {
      showBottomAlert({
        type: 'error',
        title: 'خطأ',
        message: 'تعذر فتح تطبيق واتساب.',
      });
    });
  }, []);

  const renderEmployeeItem = useCallback(
    ({ item: emp }: { item: DelegateWithStatus }) => {
      // Strictly delegate role display
      const hasPlate = Boolean(emp.motorcycle_number && emp.motorcycle_number.trim());
      const hasKey = Boolean(emp.key_number && emp.key_number.trim());
      const plateComponents = hasPlate
        ? parsePlateComponents(emp.motorcycle_number || '')
        : { digits: '', letters: '' };

      return (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => setSelectedEmpForEdit(emp)}
          style={[
            styles.employeeCard,
            {
              backgroundColor: colors.card,
              borderColor: emp.is_working ? '#10b98160' : colors.border,
            },
          ]}
        >
          {/* Card Top Row: Key Badge + Name & Meta + Edit Action */}
          <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Prominent Key Number Box (Sorted 1, 2, 3...) */}
            <View
              style={[
                styles.keyRankBox,
                {
                  backgroundColor: hasKey
                    ? isDarkMode
                      ? 'rgba(245, 158, 11, 0.16)'
                      : '#fffbeb'
                    : isDarkMode
                    ? '#1e293b'
                    : '#f1f5f9',
                  borderColor: hasKey ? '#f59e0b60' : colors.border,
                },
              ]}
            >
              <Ionicons
                name="key"
                size={13}
                color={hasKey ? '#d97706' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.keyRankNumber,
                  { color: hasKey ? '#d97706' : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {hasKey ? emp.key_number : '--'}
              </Text>
            </View>

            {/* Name & Role Badges */}
            <View style={[styles.empInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                style={[styles.empName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {emp.name}
              </Text>

              <View style={[styles.badgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.roleBadge, { backgroundColor: '#0284c718' }]}>
                  <Text style={[styles.roleBadgeText, { color: '#0284c7' }]}>
                    مندوب
                  </Text>
                </View>

                {emp.is_working && (
                  <View style={[styles.workingBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.workingDot} />
                    <Text style={styles.workingBadgeText}>في الميدان</Text>
                  </View>
                )}

                {!!emp.application_type && (
                  <View style={[styles.appBadge, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                    <Text style={[styles.appBadgeText, { color: colors.textSecondary }]}>
                      {emp.application_type} {emp.application_id ? `#${emp.application_id}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Call / WhatsApp / Open Page */}
            <View style={[styles.quickActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {!!emp.phone && (
                <>
                  <TouchableOpacity
                    style={[styles.iconActionBtn, { backgroundColor: '#10b98115' }]}
                    onPress={() => handleCall(emp.phone)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="call" size={15} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconActionBtn, { backgroundColor: '#25D36615' }]}
                    onPress={() => handleWhatsApp(emp.phone)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                  </TouchableOpacity>
                </>
              )}
              <View style={[styles.openPagePill, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={16}
                  color={colors.primary}
                />
              </View>
            </View>
          </View>

          {/* Compact Footer Strip: ID/Code on one side + Sleek Mini Plate on the other */}
          <View
            style={[
              styles.cardBottomStrip,
              {
                backgroundColor: isDarkMode ? '#1e293b90' : '#f8fafc',
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 4 }}>
              <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="card-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  الهوية: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{emp.national_id || '---'}</Text>
                </Text>
              </View>
              <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  الجوال: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{emp.phone || '---'}</Text>
                </Text>
              </View>
            </View>

            {hasPlate ? (
              <SaudiPlateView
                digits={plateComponents.digits}
                letters={plateComponents.letters}
                editable={false}
                scale={0.42}
                isDarkMode={isDarkMode}
              />
            ) : (
              <View style={[styles.noPlatePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                <Text style={styles.noPlateText}>بدون لوحة</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [colors, isDarkMode, isRTL, handleCall, handleWhatsApp]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Fixed Header: Summary Chips + Search Input */}
      <View style={styles.topHeaderArea}>
        {/* Quick Filter Chips */}
        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[
              styles.statChip,
              {
                backgroundColor: roleFilter === 'ALL' ? colors.primary : colors.card,
                borderColor: roleFilter === 'ALL' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setRoleFilter('ALL')}
            activeOpacity={0.75}
          >
            <Text style={[styles.statNum, { color: roleFilter === 'ALL' ? '#fff' : colors.textPrimary }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLbl, { color: roleFilter === 'ALL' ? '#e0f2fe' : colors.textSecondary }]}>
              الكل (مرتب بالمفاتيح)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statChip,
              {
                backgroundColor: roleFilter === 'WORKING' ? '#10b981' : colors.card,
                borderColor: roleFilter === 'WORKING' ? '#10b981' : colors.border,
              },
            ]}
            onPress={() => setRoleFilter('WORKING')}
            activeOpacity={0.75}
          >
            <Text style={[styles.statNum, { color: roleFilter === 'WORKING' ? '#fff' : '#10b981' }]}>
              {stats.working}
            </Text>
            <Text style={[styles.statLbl, { color: roleFilter === 'WORKING' ? '#dcfce7' : colors.textSecondary }]}>
              يعمل الآن
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statChip,
              {
                backgroundColor: roleFilter === 'NO_PLATE' ? '#ef4444' : colors.card,
                borderColor: roleFilter === 'NO_PLATE' ? '#ef4444' : colors.border,
              },
            ]}
            onPress={() => setRoleFilter('NO_PLATE')}
            activeOpacity={0.75}
          >
            <Text style={[styles.statNum, { color: roleFilter === 'NO_PLATE' ? '#fff' : '#ef4444' }]}>
              {stats.noPlate}
            </Text>
            <Text style={[styles.statLbl, { color: roleFilter === 'NO_PLATE' ? '#fee2e2' : colors.textSecondary }]}>
              بدون لوحة
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            placeholder="ابحث برقم المفتاح، الاسم، اللوحة، أو الهوية..."
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

      {/* Virtualized Employee List for Instant Opening */}
      {loading && employees.length === 0 ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            جاري تحميل قائمة الموظفين...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEmployeeItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={44} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                لا يوجد موظفون مطابقون للبحث
              </Text>
            </View>
          }
        />
      )}

      {/* Full-Screen Employee Edit Page */}
      <EditEmployeeModal
        visible={Boolean(selectedEmpForEdit)}
        employee={selectedEmpForEdit}
        vehicles={vehicles}
        onClose={() => setSelectedEmpForEdit(null)}
        onSuccess={(updatedEmp) => {
          onEmployeeUpdated(updatedEmp);
        }}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeaderArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  statsRow: {
    gap: 8,
    marginBottom: 10,
  },
  statChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  searchContainer: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  employeeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  keyRankBox: {
    minWidth: 52,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 2,
  },
  keyRankNumber: {
    fontSize: 14,
    fontWeight: '900',
  },
  empInfoCol: {
    flex: 1,
    gap: 4,
  },
  empName: {
    fontSize: 15,
    fontWeight: '800',
  },
  badgeRow: {
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  workingBadge: {
    backgroundColor: '#10b98118',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    gap: 4,
  },
  workingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  workingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  appBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  appBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionsRow: {
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openPagePill: {
    width: 30,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottomStrip: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaItem: {
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noPlatePill: {
    backgroundColor: '#ef444415',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  noPlateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
});
