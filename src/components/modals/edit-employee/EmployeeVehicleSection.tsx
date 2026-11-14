import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { editEmployeeStyles as styles } from './editEmployeeStyles';

interface EmployeeVehicleSectionProps {
  keyNumber: string;
  setKeyNumber: (v: string) => void;
  motorcycleNumber: string;
  setMotorcycleNumber: (v: string) => void;
  vehicleType: string;
  setVehicleType: (v: string) => void;
  plateComponents: { digits: string; letters: string };
  onOpenPlatePicker: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

const VEHICLE_TYPES = [
  { key: 'motorcycle', label: 'دراجة نارية (دباب)', icon: 'bicycle-outline' },
  { key: 'car', label: 'سيارة', icon: 'car-outline' },
] as const;

/** Vehicle, plate preview banner, key number, and vehicle type section. */
export const EmployeeVehicleSection: React.FC<EmployeeVehicleSectionProps> = ({
  keyNumber,
  setKeyNumber,
  motorcycleNumber,
  setMotorcycleNumber,
  vehicleType,
  setVehicleType,
  plateComponents,
  onOpenPlatePicker,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const inputBg = isDarkMode ? '#1e293b' : '#f8fafc';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardTitleRow, { flexDirection: rowDir }]}>
        <View style={[styles.cardIconWrap, { backgroundColor: '#0284c718' }]}>
          <Ionicons name="bicycle" size={18} color="#0284c7" />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>بيانات الدباب ورقم المفتاح</Text>
      </View>

      <View style={[styles.compactPlateBanner, { backgroundColor: inputBg, borderColor: colors.border, flexDirection: rowDir }]}>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 6 }}>
          <View style={[styles.keyPillLarge, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50', flexDirection: rowDir }]}>
            <Ionicons name="key" size={15} color="#d97706" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#d97706' }}>
              مفتاح الدباب: {keyNumber || 'غير محدد'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }}>
            {motorcycleNumber.trim() ? `اللوحة المسجلة: ${motorcycleNumber}` : 'لم يتم ربط لوحة دباب بعد'}
          </Text>
        </View>

        <SaudiPlateView
          digits={plateComponents.digits}
          letters={plateComponents.letters}
          editable={false}
          scale={0.46}
          isDarkMode={isDarkMode}
        />
      </View>

      <View style={[styles.dualRow, { flexDirection: rowDir, marginTop: 12 }]}>
        <View style={[styles.inputGroup, { flex: 0.85 }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>رقم المفتاح</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: inputBg,
                borderColor: colors.border,
                color: colors.textPrimary,
                textAlign: 'center',
                fontWeight: '800',
                fontSize: 16,
              },
            ]}
            value={keyNumber}
            onChangeText={(val) => setKeyNumber(toEnglishDigits(val))}
            placeholder="مثلاً: 12"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1.45 }]}>
          <View style={[styles.labelWithAction, { flexDirection: rowDir }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>لوحة الدباب</Text>
            {motorcycleNumber ? (
              <TouchableOpacity onPress={() => setMotorcycleNumber('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>مسح اللوحة</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.selectorTriggerBtn,
              { backgroundColor: inputBg, borderColor: motorcycleNumber ? colors.primary : colors.border, flexDirection: rowDir },
            ]}
            onPress={onOpenPlatePicker}
            activeOpacity={0.75}
          >
            <View style={[styles.selectorTriggerContent, { flexDirection: rowDir }]}>
              <Ionicons name="bicycle" size={18} color={motorcycleNumber ? colors.primary : colors.textSecondary} />
              <Text
                style={[
                  styles.selectorTriggerValue,
                  { color: motorcycleNumber ? colors.textPrimary : colors.textSecondary, fontWeight: motorcycleNumber ? '800' : '500' },
                ]}
                numberOfLines={1}
              >
                {motorcycleNumber || 'اختر لوحة الدباب من الأسطول...'}
              </Text>
            </View>
            <View style={[styles.selectorTriggerBadge, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.selectorTriggerBadgeText, { color: colors.primary }]}>
                {motorcycleNumber ? 'تغيير' : 'اختيار'}
              </Text>
              <Ionicons name="search" size={13} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.inputGroup, { marginTop: 4, marginBottom: 0 }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>نوع المركبة</Text>
        <View style={[styles.chipsContainer, { flexDirection: rowDir }]}>
          {VEHICLE_TYPES.map((item) => {
            const selected = vehicleType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setVehicleType(item.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? '#0284c720' : isDarkMode ? '#1e293b' : '#f1f5f9',
                    borderColor: selected ? '#0284c7' : colors.border,
                    flexDirection: rowDir,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={16} color={selected ? '#0284c7' : colors.textSecondary} />
                <Text style={[styles.chipText, { color: selected ? '#0284c7' : colors.textPrimary, fontWeight: selected ? '700' : '500' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};
