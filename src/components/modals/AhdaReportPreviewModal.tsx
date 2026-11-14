import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustodyDayData, CustodyLogItem } from '../../services/custodyService';
import { formatImageUrl } from '../../services/api';
import { toArabicDigits } from '../../utils/formatters';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { ahdaReportPreviewStyles as styles } from './report-preview/ahdaReportPreviewStyles';
import {
  REPORT_CATEGORIES,
  ReportPreviewSummarySection,
} from './report-preview/ReportPreviewSummarySection';
import { ReportPreviewInvoicesSection } from './report-preview/ReportPreviewInvoicesSection';

interface AhdaReportPreviewModalProps {
  visible: boolean;
  currentDay: CustodyDayData | null;
  selectedDate: string;
  currentUser: any;
  dayLogs?: CustodyLogItem[];
  effectiveOpeningBalance: number;
  colors: any;
  isDarkMode: boolean;
  loading?: boolean;
  onClose: () => void;
  onExportAndShare: () => void;
  onPreviewImage: (url: string) => void;
  onUpdateLedgerImage?: (imageUri: string) => void;
}

export const AhdaReportPreviewModal: React.FC<AhdaReportPreviewModalProps> = ({
  visible,
  currentDay,
  selectedDate,
  currentUser,
  dayLogs = [],
  effectiveOpeningBalance,
  colors,
  isDarkMode,
  loading = false,
  onClose,
  onExportAndShare,
  onPreviewImage,
  onUpdateLedgerImage,
}) => {
  const insets = useSafeAreaInsets();

  const handlePickLedgerImage = () => {
    Alert.alert(
      'صورة الدفتر اليومي',
      'اختر طريقة إرفاق أو استبدال صورة الدفتر اليومي للعهدة:',
      [
        {
          text: 'التقاط صورة بالكاميرا',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('إذن مطلوب', 'يرجى السماح للتطبيق بالوصول للكاميرا');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.88,
              });
              if (!result.canceled && result.assets[0]?.uri) {
                let finalUri = result.assets[0].uri;
                try {
                  const manip = await manipulateAsync(finalUri, [], {
                    compress: 0.88,
                    format: SaveFormat.JPEG,
                  });
                  if (manip.uri) finalUri = manip.uri;
                } catch (_) {}
                onUpdateLedgerImage?.(finalUri);
              }
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'فشل فتح الكاميرا');
            }
          },
        },
        {
          text: 'اختيار من معرض الصور',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('إذن مطلوب', 'يرجى السماح للتطبيق بالوصول للصور');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.88,
              });
              if (!result.canceled && result.assets[0]?.uri) {
                let finalUri = result.assets[0].uri;
                try {
                  const manip = await manipulateAsync(finalUri, [], {
                    compress: 0.88,
                    format: SaveFormat.JPEG,
                  });
                  if (manip.uri) finalUri = manip.uri;
                } catch (_) {}
                onUpdateLedgerImage?.(finalUri);
              }
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'فشل فتح معرض الصور');
            }
          },
        },
        { text: 'إلغاء', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  if (!visible) return null;

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 38 : 20);
  const bottomInset = Math.max(insets.bottom, 12);

  const supervisorName = currentUser?.name || currentUser?.username || 'ابراهيم محمود';
  const cleanDateStr = toArabicDigits(selectedDate);

  const effectiveOpening = Number(effectiveOpeningBalance || currentDay?.opening_balance || 0);
  const custodyAddedLogs = dayLogs.filter(
    (log) => log.action_type === 'ADD_CUSTODY' || log.action_type === 'add' || log.action_type === 'custody_added'
  );
  const logsAddedSum = custodyAddedLogs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const addedAmount = Number(currentDay?.added_amount || 0) > 0 ? Number(currentDay?.added_amount) : logsAddedSum;
  const totalExpenses = Number(currentDay?.total_expenses || 0);
  const closingBalance = Number(effectiveOpening + addedAmount - totalExpenses);

  const expenses = currentDay?.expenses || [];

  const groupedCategories = REPORT_CATEGORIES.map((cat) => {
    const catExpenses = expenses.filter((e) => e.category === cat.key);
    const catTotal = catExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return {
      ...cat,
      expenses: catExpenses,
      total: catTotal,
    };
  }).filter((group) => group.expenses.length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#0b0f19' : '#f1f5f9' }]}>
        <View style={[styles.navHeader, { paddingTop: topInset + 6 }]}>
          <TouchableOpacity
            style={styles.closeIconBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.navTitleGroup}>
            <View style={styles.navTitleRow}>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={{ width: 22, height: 22, borderRadius: 6, marginLeft: 4 }}
                resizeMode="contain"
              />
              <Text style={styles.navTitleText}>معاينة تقرير العهدة اليومية</Text>
            </View>
            <View style={styles.navDateBadge}>
              <Text style={styles.navDateText}>تاريخ: {cleanDateStr}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.quickShareBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={onExportAndShare}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="share-social" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.documentSheet,
              {
                backgroundColor: isDarkMode ? '#131b2e' : '#ffffff',
                borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
              },
            ]}
          >
            <ModuleErrorBoundary moduleName="ملخص تقرير العهدة">
              <ReportPreviewSummarySection
                supervisorName={supervisorName}
                cleanDateStr={cleanDateStr}
                effectiveOpening={effectiveOpening}
                addedAmount={addedAmount}
                totalExpenses={totalExpenses}
                closingBalance={closingBalance}
                groupedCategories={groupedCategories}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            </ModuleErrorBoundary>

            <ModuleErrorBoundary moduleName="صورة الدفتر اليومي">
              {currentDay?.ledger_image_url ? (
                <View style={{ marginTop: 22, paddingHorizontal: 12 }}>
                  <View style={styles.sectionHeaderRowBetween}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                      <View style={styles.sectionIndicator} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        صورة الدفتر
                      </Text>
                    </View>
                    {onUpdateLedgerImage && (
                      <TouchableOpacity
                        style={[
                          styles.changeLedgerBtn,
                          {
                            backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
                            borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                          },
                        ]}
                        onPress={handlePickLedgerImage}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera-reverse-outline" size={14} color="#059669" />
                        <Text style={[styles.changeLedgerBtnText, { color: colors.textPrimary }]}>
                          استبدال الصورة
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {(() => {
                    const fullLedger = formatImageUrl(currentDay.ledger_image_url);
                    if (!fullLedger) return null;
                    return (
                      <View
                        style={[
                          styles.invoiceCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            marginTop: 6,
                            padding: 6,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.imagePreviewWrap,
                            {
                              height: 280,
                              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                              borderWidth: 1,
                              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                            },
                          ]}
                          activeOpacity={0.88}
                          onPress={() => onPreviewImage(fullLedger)}
                        >
                          <Image
                            source={{ uri: fullLedger }}
                            style={styles.invoiceImg}
                            resizeMode="contain"
                          />
                          <View style={styles.imageOverlayBtn}>
                            <Ionicons name="scan-outline" size={14} color="#ffffff" />
                            <Text style={styles.imageOverlayText}>انقر لتكبير صورة الدفتر</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              ) : onUpdateLedgerImage ? (
                <View style={{ marginTop: 22, paddingHorizontal: 12 }}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionIndicator} />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      صورة الدفتر
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.emptyLedgerBox,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={handlePickLedgerImage}
                  >
                    <Ionicons name="camera-outline" size={28} color="#059669" />
                    <Text style={[styles.emptyLedgerText, { color: colors.textPrimary }]}>
                      إرفاق صورة الدفتر اليومي
                    </Text>
                    <Text style={[styles.emptyLedgerSub, { color: colors.textSecondary }]}>
                      ستظهر الصورة في الصفحة الأولى لتقرير الـ PDF
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ModuleErrorBoundary>

            <ModuleErrorBoundary moduleName="فواتير التقرير">
              <ReportPreviewInvoicesSection
                expenses={expenses}
                groupedCategories={groupedCategories}
                colors={colors}
                isDarkMode={isDarkMode}
                onPreviewImage={onPreviewImage}
              />
            </ModuleErrorBoundary>

            <View style={styles.docFooter}>
              <Text style={[styles.docFooterText, { color: colors.textSecondary }]}>
                — تم إعداد التقرير وتوثيق الفواتير بنجاح —
              </Text>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDarkMode ? '#111827' : '#ffffff',
              borderTopColor: isDarkMode ? '#1f2937' : '#e2e8f0',
              paddingBottom: bottomInset + 4,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.shareActionBtn,
              {
                backgroundColor: '#047857',
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={onExportAndShare}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.shareActionBtnText}>جاري إنشاء ملف الـ PDF...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                <Text style={styles.shareActionBtnText}>مشاركة وإرسال ملف الـ PDF</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.closeActionBtn,
              {
                borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                backgroundColor: isDarkMode ? '#1f2937' : '#f1f5f9',
              },
            ]}
            onPress={onClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeActionBtnText, { color: colors.textPrimary }]}>
              إغلاق المعاينة
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
