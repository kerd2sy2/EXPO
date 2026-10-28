import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import { DelegateWithStatus } from '../services/supervisor';
import { VehicleItem } from '../services/operations';
import { EditEmployeeModal } from '../components/modals/EditEmployeeModal';

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

type FilterRole = 'all' | 'drivers' | 'staff' | 'working';

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
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [selectedEmpForEdit, setSelectedEmpForEdit] = useState<DelegateWithStatus | null>(null);

  // Filter and search logic
  const filteredEmployees = useMemo(() => {
    let list = employees || [];

    // Filter by role or active status
    if (filterRole === 'drivers') {
      list = list.filter((e) => {
        const role = (e.job_role || (e as any).role_name || '').toUpperCase();
        return role === 'DRIVER' || (!role.includes('SUPERVISOR') && !role.includes('ADMIN'));
      });
    } else if (filterRole === 'staff') {
      list = list.filter((e) => {
        const role = (e.job_role || (e as any).role_name || '').toUpperCase();
        return role.includes('SUPERVISOR') || role.includes('ADMIN');
      });
    } else if (filterRole === 'working') {
      list = list.filter((e) => !!e.is_working);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => {
        return (
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.phone && e.phone.includes(q)) ||
          (e.national_id && e.national_id.includes(q)) ||
          (e.employee_number && e.employee_number.toLowerCase().includes(q)) ||
          (e.motorcycle_number && e.motorcycle_number.toLowerCase().includes(q)) ||
          (e.application_id && e.application_id.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [employees, filterRole, searchQuery]);

  // Counts for filter badges
  const counts = useMemo(() => {
    const list = employees || [];
    const drivers = list.filter((e) => {
      const role = (e.job_role || (e as any).role_name || '').toUpperCase();
      return role === 'DRIVER' || (!role.includes('SUPERVISOR') && !role.includes('ADMIN'));
    }).length;
    const staff = list.filter((e) => {
      const role = (e.job_role || (e as any).role_name || '').toUpperCase();
      return role.includes('SUPERVISOR') || role.includes('ADMIN');
    }).length;
    const working = list.filter((e) => !!e.is_working).length;

    return { all: list.length, drivers, staff, working };
  }, [employees]);

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا الموظف');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('خطأ', 'تعذر فتح تطبيق الهاتف');
    });
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا الموظف');
      return;
    }
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('05')) {
      clean = '966' + clean.substring(1);
    }
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() => {
      Linking.openURL(`https://wa.me/${clean}`).catch(() => {
        Alert.alert('خطأ', 'تعذر فتح تطبيق واتساب');
      });
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search Input Bar */}
      <View style={[styles.searchBarWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[
            styles.searchInput,
            { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
          ]}
          placeholder="ابحث بالاسم، الجوال، الهوية، اللوحة، أو الكود..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {[
          { key: 'all' as FilterRole, label: 'الكل', count: counts.all, color: colors.primary },
          { key: 'drivers' as FilterRole, label: 'المناديب', count: counts.drivers, color: '#0284c7' },
          { key: 'staff' as FilterRole, label: 'الإشراف', count: counts.staff, color: '#8b5cf6' },
          { key: 'working' as FilterRole, label: 'في الميدان', count: counts.working, color: '#10b981' },
        ].map((tab) => {
          const active = filterRole === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                {
                  backgroundColor: active ? tab.color + '18' : isDarkMode ? '#1e293b' : '#f1f5f9',
                  borderColor: active ? tab.color : 'transparent',
                },
              ]}
              onPress={() => setFilterRole(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabLabel,
                  { color: active ? tab.color : colors.textSecondary, fontWeight: active ? '800' : '600' },
                ]}
              >
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Employees Scroll List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {filteredEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'لا يوجد موظف مطابق للبحث' : 'لا يوجد موظفين مسجلين حالياً'}
            </Text>
          </View>
        ) : (
          filteredEmployees.map((emp) => {
            const isWorking = !!emp.is_working;
            const plate = parsePlateComponents(emp.motorcycle_number || '');
            const rawRole = (emp.job_role || (emp as any).role_name || '').toUpperCase();
            const isDriver = rawRole === 'DRIVER' || (!rawRole.includes('SUPERVISOR') && !rawRole.includes('ADMIN'));
            const isSupervisor = rawRole.includes('SUPERVISOR');

            return (
              <View
                key={emp.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isWorking ? '#10B98140' : colors.border,
                  },
                ]}
              >
                {/* Top Section: Avatar, Name, Badges */}
                <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Avatar */}
                  <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '18' }]}>
                    {emp.personal_image ? (
                      <Image source={{ uri: emp.personal_image }} style={styles.avatarImg} />
                    ) : (
                      <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                        {emp.name ? emp.name.charAt(0) : 'م'}
                      </Text>
                    )}
                    {isWorking && <View style={styles.onlineDot} />}
                  </View>

                  {/* Name & Role Badges */}
                  <View style={[styles.nameBlock, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {emp.name}
                    </Text>

                    <View style={[styles.badgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {/* Role Pill */}
                      <View
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor: isDriver
                              ? '#0284c718'
                              : isSupervisor
                              ? '#8b5cf618'
                              : '#f59e0b18',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            {
                              color: isDriver ? '#0284c7' : isSupervisor ? '#8b5cf6' : '#f59e0b',
                            },
                          ]}
                        >
                          {isDriver ? 'سائق / مندوب' : isSupervisor ? 'مشرف ميداني' : 'إداري'}
                        </Text>
                      </View>

                      {/* Shift Pill */}
                      {emp.shift && (
                        <View style={[styles.shiftBadge, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                          <Text style={[styles.shiftBadgeText, { color: colors.textSecondary }]}>
                            {emp.shift === 'morning' ? 'صباحي ☀️' : emp.shift === 'evening' ? 'مسائي 🌙' : 'مرن 🔄'}
                          </Text>
                        </View>
                      )}

                      {/* Working Status Badge */}
                      {isWorking && (
                        <View style={styles.workingBadge}>
                          <Text style={styles.workingBadgeText}>في شفت نشط</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Quick Action Buttons (Call / WhatsApp) */}
                  <View style={[styles.quickActionsCol, { flexDirection: 'row', gap: 6 }]}>
                    {!!emp.phone && (
                      <>
                        <TouchableOpacity
                          style={[styles.circleActionBtn, { backgroundColor: '#10b98118' }]}
                          onPress={() => handleWhatsApp(emp.phone)}
                          activeOpacity={0.7}
                        >
                          <FontAwesome5 name="whatsapp" size={16} color="#10b981" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.circleActionBtn, { backgroundColor: colors.primary + '18' }]}
                          onPress={() => handleCall(emp.phone)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call" size={15} color={colors.primary} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                {/* Details Grid */}
                <View style={[styles.detailsGrid, { backgroundColor: isDarkMode ? '#1e293b50' : '#f8fafc' }]}>
                  {/* Phone & National ID */}
                  <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.gridCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>رقم الجوال:</Text>
                      <Text style={[styles.gridVal, { color: colors.textPrimary }]}>{emp.phone || 'غير مسجل'}</Text>
                    </View>

                    <View style={[styles.gridCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>الهوية / الإقامة:</Text>
                      <Text style={[styles.gridVal, { color: colors.textPrimary }]}>{emp.national_id || '—'}</Text>
                    </View>
                  </View>

                  {/* Code & Key Number */}
                  <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.gridCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>كود الموظف:</Text>
                      <Text style={[styles.gridVal, { color: colors.textPrimary }]}>{emp.employee_number || '—'}</Text>
                    </View>

                    <View style={[styles.gridCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>رقم المفتاح:</Text>
                      <Text style={[styles.gridVal, { color: colors.textPrimary }]}>{emp.key_number ? `🔑 ${emp.key_number}` : '—'}</Text>
                    </View>
                  </View>

                  {/* App & App ID */}
                  {(emp.application_type || emp.application_id) && (
                    <View style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.gridCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>تطبيق التوصيل:</Text>
                        <Text style={[styles.gridVal, { color: colors.textPrimary }]}>{emp.application_type || '—'}</Text>
                      </View>

                      <View style={[styles.gridCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>معرف التطبيق:</Text>
                        <Text style={[styles.gridVal, { color: colors.textPrimary }]}>{emp.application_id || '—'}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Plate Display Row if registered */}
                {emp.motorcycle_number ? (
                  <View style={[styles.plateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.plateLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="bicycle" size={16} color={colors.textSecondary} />
                      <Text style={[styles.plateDesc, { color: colors.textSecondary }]}>المركبة المسجلة:</Text>
                    </View>
                    <SaudiPlateView
                      digits={plate.digits}
                      letters={plate.letters}
                      editable={false}
                      scale={0.52}
                      isDarkMode={isDarkMode}
                    />
                  </View>
                ) : null}

                {/* Primary Edit Button */}
                <TouchableOpacity
                  style={[
                    styles.editBtn,
                    {
                      backgroundColor: colors.primary + '15',
                      borderColor: colors.primary,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => setSelectedEmpForEdit(emp)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={17} color={colors.primary} />
                  <Text style={[styles.editBtnText, { color: colors.primary }]}>
                    تعديل بيانات الموظف
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        visible={!!selectedEmpForEdit}
        employee={selectedEmpForEdit}
        vehicles={vehicles}
        onClose={() => setSelectedEmpForEdit(null)}
        onSuccess={(updated) => {
          onEmployeeUpdated(updated);
          onRefresh();
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchBarWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterTabLabel: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 30,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  empName: {
    fontSize: 15,
    fontWeight: '800',
  },
  badgesRow: {
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shiftBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shiftBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  workingBadge: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  workingBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionsCol: {
    alignItems: 'center',
  },
  circleActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsGrid: {
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridCol: {
    flex: 1,
    gap: 2,
  },
  gridLabel: {
    fontSize: 11,
  },
  gridVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  plateRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  plateLabelGroup: {
    alignItems: 'center',
    gap: 6,
  },
  plateDesc: {
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
