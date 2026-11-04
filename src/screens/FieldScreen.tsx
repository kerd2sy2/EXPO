import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { DelegateWithStatus, supervisorApi } from '../services/supervisor';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { extractKeySortValue } from './EmployeesScreen';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';

interface FieldScreenProps {
  delegates: DelegateWithStatus[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onOverrideSuccess: () => void;
}

type FieldFilter = 'working' | 'not_working' | 'all';

const calcLiveElapsed = (startIso?: string) => {
  if (!startIso) return '';
  try {
    const diffMs = Date.now() - new Date(startIso).getTime();
    if (diffMs <= 0) return 'بدأ للتو';
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs === 0) return `منذ ${remMins} د`;
    return `منذ ${hrs} س و ${remMins} د`;
  } catch {
    return '';
  }
};

export const FieldScreen: React.FC<FieldScreenProps> = ({
  delegates,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onOverrideSuccess,
}) => {
  const [filter, setFilter] = useState<FieldFilter>('working');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [overrideMode, setOverrideMode] = useState<'start' | 'end' | null>(null);

  // Override Form State
  const [bikeNum, setBikeNum] = useState('');
  const [kmValue, setKmValue] = useState('');
  const [ordersValue, setOrdersValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const counts = useMemo(() => {
    const working = delegates.filter((d) => d.is_working).length;
    const idle = delegates.length - working;
    return { working, idle, total: delegates.length };
  }, [delegates]);

  // Filter & Sort by Key Number ascending (ترتيب المفاتيح 1, 2, 3...)
  const filteredDelegates = useMemo(() => {
    const q = toEnglishDigits(searchQuery.trim()).toLowerCase();

    return delegates
      .filter((d) => {
        if (filter === 'working' && !d.is_working) return false;
        if (filter === 'not_working' && d.is_working) return false;
        if (!q) return true;

        const nameMatch = (d.name || '').toLowerCase().includes(q);
        const keyMatch = toEnglishDigits(d.key_number || '').toLowerCase().includes(q);
        const bikeMatch = toEnglishDigits(
          d.active_motorcycle || d.motorcycle_number || ''
        ).toLowerCase().includes(q);
        const appIdMatch = toEnglishDigits(d.application_id || '').toLowerCase().includes(q);

        return nameMatch || keyMatch || bikeMatch || appIdMatch;
      })
      .sort((a, b) => {
        const keyA = extractKeySortValue(a.key_number);
        const keyB = extractKeySortValue(b.key_number);
        if (keyA !== keyB) return keyA - keyB;
        return (a.name || '').localeCompare(b.name || '', 'ar');
      });
  }, [delegates, filter, searchQuery]);

  const openOverride = useCallback((d: DelegateWithStatus, mode: 'start' | 'end') => {
    setSelectedDelegate(d);
    setOverrideMode(mode);
    setBikeNum(d.active_motorcycle || d.motorcycle_number || '');
    setKmValue(d.start_km ? String(d.start_km) : '');
    setOrdersValue('');
    setNotesValue('');
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

  const handleSubmitOverride = async () => {
    if (!selectedDelegate || !overrideMode) return;

    if (overrideMode === 'start' && !bikeNum.trim()) {
      showBottomAlert({
        type: 'warning',
        title: 'بيانات مطلوبة',
        message: 'يرجى إدخال رقم لوحة الدباب لبدء الوردية.',
      });
      return;
    }
    if (!kmValue.trim() || isNaN(Number(toEnglishDigits(kmValue)))) {
      showBottomAlert({
        type: 'warning',
        title: 'بيانات مطلوبة',
        message: 'يرجى إدخال قراءة العداد (الكيلومتر) بشكل صحيح.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const numericKm = Number(toEnglishDigits(kmValue));

      if (overrideMode === 'start') {
        await supervisorApi.startShiftOverride({
          employeeId: selectedDelegate.id,
          motorcycleNumber: bikeNum.trim(),
          startKm: numericKm,
          overrideReason: 'بدء وردية بواسطة المشرف',
          notes: notesValue.trim(),
        });
      } else {
        await supervisorApi.endShiftOverride({
          employeeId: selectedDelegate.id,
          endKm: numericKm,
          ordersCount: Number(toEnglishDigits(ordersValue)) || 0,
          fuelCost: 0,
          overrideReason: 'إنهاء وردية بواسطة المشرف',
          notes: notesValue.trim(),
        });
      }

      const dName = selectedDelegate.name;
      const wasStart = overrideMode === 'start';
      setSelectedDelegate(null);
      setOverrideMode(null);
      onOverrideSuccess();

      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: wasStart ? 'تم بدء الوردية' : 'تم إنهاء الوردية',
          message: wasStart
            ? `تم فتح وردية عمل للمندوب (${dName}) بنجاح.`
            : `تم إنهاء وردية المندوب (${dName}) بنجاح.`,
        });
      }, 150);
    } catch (e: any) {
      showBottomAlert({
        type: 'error',
        title: 'تعذر تنفيذ العملية',
        message: e?.message || 'حدث خطأ أثناء تنفيذ العملية.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderDelegateCard = useCallback(
    ({ item: d }: { item: DelegateWithStatus }) => {
      const hasKey = Boolean(d.key_number && d.key_number.trim());
      const plate = d.active_motorcycle || d.motorcycle_number || 'بدون لوحة';
      const elapsed = d.is_working ? calcLiveElapsed(d.shift_start_time) : '';
      const startTimeFormatted = d.shift_start_time
        ? new Date(d.shift_start_time).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '--:--';

      return (
        <View
          style={[
            styles.delegateCard,
            {
              backgroundColor: colors.card,
              borderColor: d.is_working ? '#10b98160' : colors.border,
            },
          ]}
        >
          {/* Top Row: Key Badge + Name & Live Status + Call/WhatsApp */}
          <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.keyBox,
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
              <Ionicons name="key" size={12} color={hasKey ? '#d97706' : colors.textSecondary} />
              <Text style={[styles.keyNumberText, { color: hasKey ? '#d97706' : colors.textSecondary }]}>
                {hasKey ? d.key_number : '--'}
              </Text>
            </View>

            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.delegateName, { color: colors.textPrimary }]} numberOfLines={1}>
                {d.name}
              </Text>
              <View style={[styles.statusLine, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: d.is_working ? '#10b981' : '#ef4444' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: d.is_working ? '#10b981' : colors.textSecondary },
                  ]}
                >
                  {d.is_working ? `في الميدان (${elapsed || 'نشط'})` : 'خارج الدوام'}
                </Text>
              </View>
            </View>

            {!!d.phone && (
              <View style={[styles.commButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.commBtn, { backgroundColor: '#10b98118' }]}
                  onPress={() => handleCall(d.phone)}
                >
                  <Ionicons name="call" size={15} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.commBtn, { backgroundColor: '#25D36618' }]}
                  onPress={() => handleWhatsApp(d.phone)}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info Strip: Motorcycle Plate, Start Time / KM, App ID */}
          <View
            style={[
              styles.infoStrip,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={styles.infoCell}>
              <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>الدباب</Text>
              <Text style={[styles.infoCellValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {plate}
              </Text>
            </View>

            {d.is_working ? (
              <>
                <View style={styles.infoCell}>
                  <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>وقت البداية</Text>
                  <Text style={[styles.infoCellValue, { color: '#0284c7' }]}>{startTimeFormatted}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>كيلو البداية</Text>
                  <Text style={[styles.infoCellValue, { color: colors.textPrimary }]}>
                    {d.start_km ?? 0} كم
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.infoCell}>
                <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>المنصة والمعرف</Text>
                <Text style={[styles.infoCellValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {d.application_type || '---'} {d.application_id ? `#${d.application_id}` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Supervisor Override Action Button */}
          <TouchableOpacity
            style={[
              styles.overrideBtn,
              {
                backgroundColor: d.is_working ? '#ef444415' : '#10b98115',
                borderColor: d.is_working ? '#ef444440' : '#10b98140',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            onPress={() => openOverride(d, d.is_working ? 'end' : 'start')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={d.is_working ? 'stop-circle-outline' : 'play-circle-outline'}
              size={18}
              color={d.is_working ? '#ef4444' : '#10b981'}
            />
            <Text
              style={[
                styles.overrideBtnText,
                { color: d.is_working ? '#ef4444' : '#10b981' },
              ]}
            >
              {d.is_working ? 'إنهاء الوردية كمشرف' : 'بدء وردية للمندوب كمشرف'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [colors, isDarkMode, isRTL, handleCall, handleWhatsApp, openOverride]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Filter Tabs & Search */}
      <View style={styles.topArea}>
        <View style={[styles.tabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
            <Text style={[styles.tabLbl, { color: filter === 'working' ? '#d1fae5' : colors.textSecondary }]}>
              في الميدان الآن
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              {
                backgroundColor: filter === 'not_working' ? '#ef4444' : colors.card,
                borderColor: filter === 'not_working' ? '#ef4444' : colors.border,
              },
            ]}
            onPress={() => setFilter('not_working')}
          >
            <Text style={[styles.tabNum, { color: filter === 'not_working' ? '#fff' : '#ef4444' }]}>
              {counts.idle}
            </Text>
            <Text style={[styles.tabLbl, { color: filter === 'not_working' ? '#fee2e2' : colors.textSecondary }]}>
              خارج الدوام
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              {
                backgroundColor: filter === 'all' ? colors.primary : colors.card,
                borderColor: filter === 'all' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.tabNum, { color: filter === 'all' ? '#fff' : colors.textPrimary }]}>
              {counts.total}
            </Text>
            <Text style={[styles.tabLbl, { color: filter === 'all' ? '#e0f2fe' : colors.textSecondary }]}>
              الكل (بالمفاتيح)
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

      <FlatList
        data={filteredDelegates}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderDelegateCard}
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
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="bicycle-outline" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {filter === 'working'
                ? 'لا يوجد مناديب في الميدان حالياً'
                : 'لا يوجد مناديب مطابقون للبحث'}
            </Text>
          </View>
        }
      />

      {/* Supervisor Override Start / End Shift Modal */}
      <Modal
        visible={Boolean(selectedDelegate && overrideMode)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedDelegate(null);
          setOverrideMode(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {overrideMode === 'start'
                  ? `بدء وردية: ${selectedDelegate?.name}`
                  : `إنهاء وردية: ${selectedDelegate?.name}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDelegate(null);
                  setOverrideMode(null);
                }}
              >
                <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {overrideMode === 'start' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    رقم لوحة الدباب
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                    placeholder="أدخل رقم اللوحة..."
                    placeholderTextColor={colors.textSecondary}
                    value={bikeNum}
                    onChangeText={setBikeNum}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {overrideMode === 'start' ? 'كيلو البداية (كم)' : 'كيلو النهاية (كم)'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                    textAlign: 'center',
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={kmValue}
                onChangeText={(v) => setKmValue(toEnglishDigits(v))}
              />

              {overrideMode === 'end' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    عدد الطلبات المنجزة
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        textAlign: 'center',
                      },
                    ]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={ordersValue}
                    onChangeText={(v) => setOrdersValue(toEnglishDigits(v))}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                ملاحظات المشرف
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                placeholder="سبب التدخل الإداري..."
                placeholderTextColor={colors.textSecondary}
                value={notesValue}
                onChangeText={setNotesValue}
              />

              <TouchableOpacity
                style={[
                  styles.submitOverrideBtn,
                  { backgroundColor: overrideMode === 'start' ? '#10b981' : '#ef4444' },
                ]}
                onPress={handleSubmitOverride}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitOverrideBtnText}>
                    {overrideMode === 'start' ? 'تأكيد بدء الوردية' : 'تأكيد إنهاء الوردية'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  tabsRow: {
    gap: 8,
    marginBottom: 10,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  tabLbl: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  searchBar: {
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
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  delegateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  cardTopRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  keyBox: {
    minWidth: 48,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 2,
  },
  keyNumberText: {
    fontSize: 13,
    fontWeight: '900',
  },
  delegateName: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusLine: {
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commButtons: {
    alignItems: 'center',
    gap: 6,
  },
  commBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoStrip: {
    borderRadius: 11,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    justifyContent: 'space-around',
  },
  infoCell: {
    alignItems: 'center',
    flex: 1,
  },
  infoCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoCellValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  overrideBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  overrideBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  submitOverrideBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  submitOverrideBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
