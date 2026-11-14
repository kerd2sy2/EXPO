import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { DELIVERY_APPS } from './editEmployeeHelpers';
import { editEmployeeStyles as styles } from './editEmployeeStyles';
import { EmployeeVehicleSection } from './EmployeeVehicleSection';

export interface EmployeeEditFormBodyProps {
  errorMsg: string;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  nationalId: string;
  setNationalId: (v: string) => void;
  employeeNumber: string;
  setEmployeeNumber: (v: string) => void;
  iqamaExpirationDate: string;
  setIqamaExpirationDate: (v: string) => void;
  jobRole: string;
  setJobRole: (v: string) => void;
  shift: string;
  setShift: (v: string) => void;
  vehicleType: string;
  setVehicleType: (v: string) => void;
  motorcycleNumber: string;
  setMotorcycleNumber: (v: string) => void;
  keyNumber: string;
  setKeyNumber: (v: string) => void;
  plateComponents: { digits: string; letters: string };
  onOpenPlatePicker: () => void;
  applicationType: string;
  onSelectDeliveryApp: (key: string) => void;
  applicationId: string;
  setApplicationId: (v: string) => void;
  onOpenIdentifierPicker: () => void;
  showPasswordSection: boolean;
  setShowPasswordSection: (v: boolean) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

const JOB_ROLES = [
  { key: 'DRIVER', label: 'مندوب توصيل', icon: 'bicycle-outline' },
  { key: 'SUPERVISOR', label: 'مشرف ميداني', icon: 'shield-outline' },
  { key: 'ADMIN', label: 'إداري', icon: 'business-outline' },
] as const;

const WORK_SHIFTS = [
  { key: 'morning', label: 'صباحي ☀️' },
  { key: 'evening', label: 'مسائي 🌙' },
  { key: 'flexible', label: 'مرن 🔄' },
] as const;

/** Scrollable form body for editing delegate vehicle, profile, delivery app, and password. */
export const EmployeeEditFormBody: React.FC<EmployeeEditFormBodyProps> = (props) => {
  const { colors, isDarkMode, isRTL } = props;
  const inputBg = isDarkMode ? '#1e293b' : '#f8fafc';
  const chipBg = isDarkMode ? '#1e293b' : '#f1f5f9';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const alignTxt = isRTL ? 'right' : 'left';
  const inputStyle = [
    styles.input,
    { backgroundColor: inputBg, borderColor: colors.border, color: colors.textPrimary, textAlign: alignTxt as 'right' | 'left' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {!!props.errorMsg && (
        <View style={[styles.errorBanner, { flexDirection: rowDir }]}>
          <Ionicons name="alert-circle" size={18} color="#ef4444" />
          <Text style={styles.errorBannerText}>{props.errorMsg}</Text>
        </View>
      )}

      <ModuleErrorBoundary moduleName="VehicleSection" colors={colors}>
        <EmployeeVehicleSection
          keyNumber={props.keyNumber}
          setKeyNumber={props.setKeyNumber}
          motorcycleNumber={props.motorcycleNumber}
          setMotorcycleNumber={props.setMotorcycleNumber}
          vehicleType={props.vehicleType}
          setVehicleType={props.setVehicleType}
          plateComponents={props.plateComponents}
          onOpenPlatePicker={props.onOpenPlatePicker}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="PersonalSection" colors={colors}>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardTitleRow, { flexDirection: rowDir }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>البيانات الشخصية والوظيفية</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>اسم الموظف *</Text>
            <TextInput style={inputStyle} value={props.name} onChangeText={props.setName} placeholder="الاسم الكامل" placeholderTextColor={colors.textSecondary} />
          </View>

          <View style={[styles.dualRow, { flexDirection: rowDir }]}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>رقم الجوال</Text>
              <TextInput
                style={inputStyle}
                value={props.phone}
                onChangeText={(v) => props.setPhone(toEnglishDigits(v))}
                placeholder="05xxxxxxxx"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>رقم الهوية / الإقامة *</Text>
              <TextInput
                style={inputStyle}
                value={props.nationalId}
                onChangeText={(v) => props.setNationalId(toEnglishDigits(v))}
                placeholder="10 خانات"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={[styles.dualRow, { flexDirection: rowDir }]}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>كود الموظف</Text>
              <TextInput style={inputStyle} value={props.employeeNumber} onChangeText={props.setEmployeeNumber} placeholder="مثلاً: 1045" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>تاريخ انتهاء الإقامة</Text>
              <TextInput style={inputStyle} value={props.iqamaExpirationDate} onChangeText={props.setIqamaExpirationDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>المسمى الوظيفي</Text>
            <View style={[styles.chipsContainer, { flexDirection: rowDir }]}>
              {JOB_ROLES.map((item) => {
                const selected = props.jobRole === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => props.setJobRole(item.key)}
                    style={[styles.chip, { backgroundColor: selected ? colors.primary + '20' : chipBg, borderColor: selected ? colors.primary : colors.border, flexDirection: rowDir }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={item.icon as any} size={15} color={selected ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.chipText, { color: selected ? colors.primary : colors.textPrimary, fontWeight: selected ? '700' : '500' }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>وردية العمل</Text>
            <View style={[styles.chipsContainer, { flexDirection: rowDir }]}>
              {WORK_SHIFTS.map((item) => {
                const selected = props.shift === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => props.setShift(item.key)}
                    style={[styles.chip, { backgroundColor: selected ? '#10b98120' : chipBg, borderColor: selected ? '#10b981' : colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: selected ? '#10b981' : colors.textPrimary, fontWeight: selected ? '700' : '500' }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="AppAndPasswordSection" colors={colors}>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardTitleRow, { flexDirection: rowDir }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#10b98118' }]}>
              <Ionicons name="apps-outline" size={18} color="#10b981" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>منصة التوصيل والمعرف (ID)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>المنصات (كيتا، نينجا، هنقرستيشن...)</Text>
            <View style={[styles.chipsContainer, { flexDirection: rowDir }]}>
              {DELIVERY_APPS.map((app) => {
                const selected = props.applicationType.toLowerCase() === app.key;
                return (
                  <TouchableOpacity
                    key={app.key}
                    onPress={() => props.onSelectDeliveryApp(app.key)}
                    style={[styles.chip, { backgroundColor: selected ? colors.primary + '20' : chipBg, borderColor: selected ? colors.primary : colors.border, flexDirection: rowDir }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={(app.icon as any) || 'apps-outline'} size={14} color={selected ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.chipText, { color: selected ? colors.primary : colors.textPrimary, fontWeight: selected ? '700' : '500' }]}>{app.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <View style={[styles.labelWithAction, { flexDirection: rowDir }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>رقم المعرف في المنصة (Application ID)</Text>
              {props.applicationId ? (
                <TouchableOpacity onPress={() => props.setApplicationId('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>مسح المعرف</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.selectorTriggerBtn, { backgroundColor: inputBg, borderColor: props.applicationId ? '#10b981' : colors.border, flexDirection: rowDir }]}
              onPress={props.onOpenIdentifierPicker}
              activeOpacity={0.75}
            >
              <View style={[styles.selectorTriggerContent, { flexDirection: rowDir }]}>
                <Ionicons name="id-card-outline" size={18} color={props.applicationId ? '#10b981' : colors.textSecondary} />
                <Text
                  style={[styles.selectorTriggerValue, { color: props.applicationId ? colors.textPrimary : colors.textSecondary, fontWeight: props.applicationId ? '800' : '500' }]}
                  numberOfLines={1}
                >
                  {props.applicationId || `اختر معرف ${DELIVERY_APPS.find((a) => a.key === props.applicationType)?.label.split(' ')[0] || ''}...`}
                </Text>
              </View>
              <View style={[styles.selectorTriggerBadge, { backgroundColor: '#10b98120' }]}>
                <Text style={[styles.selectorTriggerBadgeText, { color: '#10b981' }]}>{props.applicationId ? 'تغيير' : 'اختيار'}</Text>
                <Ionicons name="search" size={13} color="#10b981" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.passwordToggleBtn, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}
          onPress={() => props.setShowPasswordSection(!props.showPasswordSection)}
          activeOpacity={0.7}
        >
          <View style={[styles.toggleLeft, { flexDirection: rowDir }]}>
            <Ionicons name="lock-closed-outline" size={18} color="#f59e0b" />
            <Text style={[styles.passwordToggleText, { color: colors.textPrimary }]}>تغيير أو إعادة تعيين كلمة المرور للموظف</Text>
          </View>
          <Ionicons name={props.showPasswordSection ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {props.showPasswordSection && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: alignTxt }]}>كلمة المرور الجديدة</Text>
            <TextInput
              style={inputStyle}
              value={props.newPassword}
              onChangeText={props.setNewPassword}
              placeholder="أدخل كلمة مرور جديدة (4 خانات على الأقل)"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>
        )}
      </ModuleErrorBoundary>
    </ScrollView>
  );
};
