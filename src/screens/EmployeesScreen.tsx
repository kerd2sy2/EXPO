import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
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
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus, supervisorApi } from '../services/supervisor';
import { VehicleItem } from '../services/operations';
import { EditEmployeeModal } from '../components/modals/EditEmployeeModal';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import {
  RoleFilter,
  extractKeySortValue,
  filterAndSortEmployees,
} from './employees/employeesHelpers';
import { employeesStyles as styles } from './employees/employeesStyles';
import { EmployeeCard } from './employees/EmployeeCard';

export { extractKeySortValue };

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

export const EmployeesScreen: React.FC<EmployeesScreenProps> = React.memo(({
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
  const [roleFilter] = useState<RoleFilter>('ALL');
  const [selectedEmpForEdit, setSelectedEmpForEdit] = useState<DelegateWithStatus | null>(null);
  const [remoteResults, setRemoteResults] = useState<DelegateWithStatus[]>([]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setRemoteResults([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const found = await supervisorApi.searchDelegates(q);
        if (isMounted) {
          setRemoteResults(found);
        }
      } catch (err) {
        console.warn('Search delegates error:', err);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const filteredEmployees = useMemo(
    () =>
      filterAndSortEmployees({
        employees,
        remoteResults,
        searchQuery,
        roleFilter,
      }),
    [employees, remoteResults, searchQuery, roleFilter]
  );

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

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ModuleErrorBoundary moduleName="شريط بحث الموظفين" colors={colors}>
        <View style={styles.topHeaderArea}>
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
                { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
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
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="قائمة الموظفين" colors={colors} onReset={onRefresh}>
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
            renderItem={({ item }) => (
              <ModuleErrorBoundary moduleName={`بطاقة ${item.name || 'موظف'}`} colors={colors}>
                <EmployeeCard
                  employee={item}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  onSelect={setSelectedEmpForEdit}
                  onCall={handleCall}
                  onWhatsApp={handleWhatsApp}
                />
              </ModuleErrorBoundary>
            )}
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
              <View
                style={[
                  styles.emptyBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="people-outline" size={44} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  لا يوجد موظفون مطابقون للبحث
                </Text>
              </View>
            }
          />
        )}
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="نافذة تعديل بيانات المندوب"
        colors={colors}
        onReset={() => setSelectedEmpForEdit(null)}
      >
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
      </ModuleErrorBoundary>
    </View>
  );
});
  