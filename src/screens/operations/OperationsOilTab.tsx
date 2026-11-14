import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents, toEnglishDigits } from '@shared/utils/plateUtils';
import { InventoryItem } from '../../services/operations';
import { operationsStyles as styles } from './operationsStyles';
import { EnrichedVehicleItem } from './operationsHelpers';

interface OperationsOilTabProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  dispensePlate: string;
  dispenseKm: string;
  dispenseQty: string;
  dispenseNotes: string;
  showDispenseDropdown: boolean;
  matchingDispenseVehicles: EnrichedVehicleItem[];
  submitting: boolean;
  totalOilQty: number;
  oilItem?: InventoryItem;
  isOilLow: boolean;
  onChangePlate: (text: string) => void;
  onFocusPlate: () => void;
  onClearPlate: () => void;
  onSelectBike: (bike: EnrichedVehicleItem) => void;
  onChangeKm: (val: string) => void;
  onChangeQty: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onSubmitDispense: () => void;
}

export const OperationsOilTab: React.FC<OperationsOilTabProps> = ({
  colors,
  isDarkMode,
  isRTL,
  dispensePlate,
  dispenseKm,
  dispenseQty,
  dispenseNotes,
  showDispenseDropdown,
  matchingDispenseVehicles,
  submitting,
  totalOilQty,
  oilItem,
  isOilLow,
  onChangePlate,
  onFocusPlate,
  onClearPlate,
  onSelectBike,
  onChangeKm,
  onChangeQty,
  onChangeNotes,
  onSubmitDispense,
}) => (
  <View style={styles.tabContent}>
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="water" size={24} color={colors.primary} />
        </View>
        <View style={[styles.kpiTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>
            صرف وتغيير زيت الدباب
          </Text>
          <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
            اكتب رقمين من اللوحة لتظهر لك قائمة الدبابات وتختار منها مباشرة
          </Text>
        </View>
      </View>

      <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        رقم لوحة الدباب (اكتب رقمين للبحث التلقائي) *
      </Text>
      <View style={[styles.inputWithClear, { backgroundColor: colors.bg, borderColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="search-outline" size={18} color={colors.primary} />
        <TextInput
          style={[styles.flexInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="اكتب رقمين من اللوحة (مثال: 54 أو 70)..."
          placeholderTextColor={colors.textSecondary}
          value={dispensePlate}
          onChangeText={onChangePlate}
          onFocus={onFocusPlate}
        />
        {dispensePlate.length > 0 && (
          <TouchableOpacity onPress={onClearPlate}>
            <Ionicons name="close-circle" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showDispenseDropdown && matchingDispenseVehicles.length > 0 && (
        <View style={[styles.autocompleteBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.autocompleteHeader, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
            الدبابات المطابقة ({matchingDispenseVehicles.length}) — اضغط للاختيار:
          </Text>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {matchingDispenseVehicles.slice(0, 12).map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.autocompleteItem,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => onSelectBike(v)}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={[styles.bikeIconMini, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="bicycle" size={16} color={colors.primary} />
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.autocompletePlate, { color: colors.textPrimary }]}>
                        {v.plate_number}
                      </Text>
                      {!!v.key_number && (
                        <View style={styles.keyMiniBadge}>
                          <Text style={styles.keyMiniBadgeText}>مفتاح {v.key_number}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.autocompleteKm, { color: colors.textSecondary }]} numberOfLines={1}>
                      {v.courierName ? `المندوب: ${v.courierName} • ` : ''}
                      العداد: {v.current_km || 0} كم
                    </Text>
                  </View>
                </View>
                <Ionicons name="add-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {dispensePlate.trim().length > 0 && !showDispenseDropdown && (() => {
        const parsed = parsePlateComponents(dispensePlate);
        return (
          <View style={{ alignItems: 'center', marginVertical: 4 }}>
            <SaudiPlateView
              digits={parsed.digits}
              letters={parsed.letters}
              editable={false}
              scale={0.5}
              isDarkMode={isDarkMode}
            />
          </View>
        );
      })()}

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }}>
        <View style={{ flex: 1.3 }}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            قراءة العداد الحالية (كم) *
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: 'center', fontWeight: '800' }]}
            keyboardType="numeric"
            placeholder="مثال: 45200"
            placeholderTextColor={colors.textSecondary}
            value={dispenseKm}
            onChangeText={(v) => onChangeKm(toEnglishDigits(v))}
          />
        </View>

        <View style={{ flex: 0.7 }}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            عدد العلب
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: 'center', fontWeight: '800' }]}
            keyboardType="numeric"
            value={dispenseQty}
            onChangeText={(v) => onChangeQty(toEnglishDigits(v))}
          />
        </View>
      </View>

      <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        ملاحظات (اختياري)
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
        placeholder="ملاحظات إضافية..."
        placeholderTextColor={colors.textSecondary}
        value={dispenseNotes}
        onChangeText={onChangeNotes}
      />

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
        onPress={onSubmitDispense}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>تأكيد تغيير وصرف الزيت</Text>
          </>
        )}
      </TouchableOpacity>
    </View>

    {/* Oil Stock KPI Card */}
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: isOilLow ? '#EF4444' : colors.border }]}>
      <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconCircle, { backgroundColor: isOilLow ? '#EF444415' : colors.primary + '15' }]}>
          <Ionicons name="color-fill" size={24} color={isOilLow ? '#EF4444' : colors.primary} />
        </View>
        <View style={[styles.kpiTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>مخزون زيت المحركات بالفرع</Text>
          <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
            {oilItem?.name || 'عبوات زيت المحرك المعتمدة'}
          </Text>
        </View>
      </View>

      <View style={[styles.qtyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.qtyNumber, { color: isOilLow ? '#EF4444' : colors.textPrimary }]}>
          {totalOilQty}
        </Text>
        <Text style={[styles.qtyUnit, { color: colors.textSecondary }]}>علبة متوفرة</Text>
        {isOilLow && (
          <View style={styles.lowStockBadge}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.lowStockText}>مخزون منخفض</Text>
          </View>
        )}
      </View>
    </View>
  </View>
);
