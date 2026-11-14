import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { operationsStyles as styles } from './operationsStyles';
import { EnrichedVehicleItem } from './operationsHelpers';

interface OperationsAccidentsTabProps {
  colors: ThemeColors;
  isRTL: boolean;
  accidentPlate: string;
  accidentDelName: string;
  accidentSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  accidentDesc: string;
  showAccidentDropdown: boolean;
  matchingAccidentVehicles: EnrichedVehicleItem[];
  submitting: boolean;
  onChangePlate: (val: string) => void;
  onFocusPlate: () => void;
  onSelectBike: (bike: EnrichedVehicleItem) => void;
  onChangeDelName: (val: string) => void;
  onChangeSeverity: (val: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onChangeDesc: (val: string) => void;
  onSubmitAccident: () => void;
}

export const OperationsAccidentsTab: React.FC<OperationsAccidentsTabProps> = ({
  colors,
  isRTL,
  accidentPlate,
  accidentDelName,
  accidentSeverity,
  accidentDesc,
  showAccidentDropdown,
  matchingAccidentVehicles,
  submitting,
  onChangePlate,
  onFocusPlate,
  onSelectBike,
  onChangeDelName,
  onChangeSeverity,
  onChangeDesc,
  onSubmitAccident,
}) => (
  <View style={styles.tabContent}>
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: '#EF444450' }]}>
      <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconCircle, { backgroundColor: '#EF444415' }]}>
          <Ionicons name="warning" size={24} color="#EF4444" />
        </View>
        <View style={[styles.kpiTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>تسجيل بلاغ حادث أو عطل طارئ</Text>
          <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
            اكتب رقمين من اللوحة لاختيار الدباب مباشرة
          </Text>
        </View>
      </View>

      <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>رقم لوحة الدباب المتضرر *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
        placeholder="اكتب رقمين من اللوحة..."
        placeholderTextColor={colors.textSecondary}
        value={accidentPlate}
        onChangeText={onChangePlate}
        onFocus={onFocusPlate}
      />

      {showAccidentDropdown && matchingAccidentVehicles.length > 0 && (
        <View style={[styles.autocompleteBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.autocompleteHeader, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
            الدبابات المطابقة (اضغط للاختيار):
          </Text>
          {matchingAccidentVehicles.slice(0, 6).map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.autocompleteItem, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => onSelectBike(v)}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="bicycle" size={16} color={colors.primary} />
                <Text style={[styles.autocompletePlate, { color: colors.textPrimary }]}>{v.plate_number}</Text>
                {!!v.key_number && (
                  <View style={styles.keyMiniBadge}>
                    <Text style={styles.keyMiniBadgeText}>مفتاح {v.key_number}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.autocompleteKm, { color: colors.textSecondary }]}>
                {v.courierName || 'دباب'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>اسم المندوب المعني</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
        placeholder="اسم المندوب..."
        placeholderTextColor={colors.textSecondary}
        value={accidentDelName}
        onChangeText={onChangeDelName}
      />

      <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>درجة خطورة الحادث</Text>
      <View style={[styles.severityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {(['LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[
              styles.severityBtn,
              accidentSeverity === lvl && [
                styles.severityBtnActive,
                {
                  backgroundColor:
                    lvl === 'HIGH' ? '#EF4444' : lvl === 'MEDIUM' ? '#F59E0B' : '#10B981',
                },
              ],
            ]}
            onPress={() => onChangeSeverity(lvl)}
          >
            <Text
              style={[
                styles.severityBtnText,
                { color: accidentSeverity === lvl ? '#fff' : colors.textSecondary },
              ]}
            >
              {lvl === 'HIGH' ? 'خطير وطارئ' : lvl === 'MEDIUM' ? 'متوسط' : 'طفيف'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>تفاصيل الحادث والأضرار *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
        multiline
        numberOfLines={3}
        placeholder="اكتب وصف الأضرار، سبب الحادث، وموقع الواقعة..."
        placeholderTextColor={colors.textSecondary}
        value={accidentDesc}
        onChangeText={onChangeDesc}
      />

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#EF4444', marginTop: 10 }]}
        onPress={onSubmitAccident}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>إرسال البلاغ الفوري للورشة</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
);
