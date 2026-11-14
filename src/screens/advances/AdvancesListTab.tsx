import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PendingAdvanceRequest } from '../../services/supervisor';
import { ThemeColors } from '../../types/delegate';
import { advanceStyles as styles } from './advanceStyles';

interface AdvancesListTabProps {
  advances: PendingAdvanceRequest[];
  loadingAdvances: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onCreateNew: () => void;
  onLongPressItem: (item: PendingAdvanceRequest) => void;
}

export const AdvancesListTab: React.FC<AdvancesListTabProps> = ({
  advances,
  loadingAdvances,
  colors,
  isDarkMode,
  isRTL,
  onCreateNew,
  onLongPressItem,
}) => (
  <View style={styles.listWrapper}>
    <View style={[styles.listHeaderInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.listSectionTitle, { color: colors.textPrimary }]}>
        سجل طلبات السلف المالية
      </Text>
      <Text style={[styles.listHint, { color: colors.textSecondary }]}>
        اضغط مطولاً لتعديل أو حذف السلفة
      </Text>
    </View>

    <View
      style={[
        styles.noticeBanner,
        {
          backgroundColor: isDarkMode ? '#064e3b30' : '#ecfdf5',
          borderColor: '#10b981',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Ionicons name="information-circle" size={20} color="#10b981" />
      <View style={[styles.noticeTextWrapper, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.noticeTitle, { color: '#047857' }]}>صلاحية الموافقة والاعتماد</Text>
        <Text style={[styles.noticeSub, { color: isDarkMode ? '#a7f3d0' : '#065f46', textAlign: isRTL ? 'right' : 'left' }]}>
          المشرف يرفع الطلب فقط، بينما اعتماد وصرف السلف يخضع حصرياً لموافقة الإدارة العامة والحسابات المالية.
        </Text>
      </View>
    </View>

    {loadingAdvances && advances.length === 0 ? (
      <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
    ) : advances.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Ionicons name="cash-outline" size={54} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          لا توجد طلبات سلف مسجلة
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          يمكنك رفع طلب سلفة نقدية أو سلفة إنترنت لمندوب
        </Text>
        <TouchableOpacity
          style={[styles.createFirstBtn, { backgroundColor: '#10b981' }]}
          onPress={onCreateNew}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createFirstBtnText}>طلب سلفة جديدة</Text>
        </TouchableOpacity>
      </View>
    ) : (
      advances.map((adv) => {
        const isInternet = adv.type === 'internet_advance';
        const isPending = adv.status === 'pending' || adv.status === 'PENDING' || !adv.status;
        const isApproved = adv.status === 'approved' || adv.status === 'APPROVED';

        return (
          <TouchableOpacity
            key={adv.id}
            style={[
              styles.advanceCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            activeOpacity={0.8}
            onLongPress={() => onLongPressItem(adv)}
            delayLongPress={350}
          >
            <View
              style={[
                styles.advanceIconBox,
                { backgroundColor: isInternet ? '#0284c718' : '#10b98118' },
              ]}
            >
              <Ionicons
                name={isInternet ? 'wifi' : 'cash'}
                size={22}
                color={isInternet ? '#0284c7' : '#10b981'}
              />
            </View>
            <View style={[styles.advanceInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.advHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.advName, { color: colors.textPrimary }]}>
                  {adv.employee_name}
                </Text>
                <Text style={[styles.advAmount, { color: '#10b981' }]}>
                  {adv.amount || 0} ر.س
                </Text>
              </View>

              <View style={[styles.advTagsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.typeBadge, { backgroundColor: isInternet ? '#0284c715' : '#10b98115' }]}>
                  <Text style={[styles.typeBadgeText, { color: isInternet ? '#0284c7' : '#059669' }]}>
                    {isInternet ? 'سلفة باقة نت' : 'سلفة نقدية'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isApproved
                        ? '#10b98118'
                        : isPending
                        ? '#f59e0b18'
                        : '#ef444418',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: isApproved ? '#059669' : isPending ? '#d97706' : '#ef4444',
                      },
                    ]}
                  >
                    {isApproved
                      ? 'معتمدة من الإدارة'
                      : isPending
                      ? 'قيد مراجعة الإدارة والمالية'
                      : 'مرفوضة من الإدارة'}
                  </Text>
                </View>
              </View>

              {adv.deduction_month ? (
                <Text style={[styles.advMonth, { color: colors.textSecondary }]}>
                  شهر الاستقطاع: {adv.deduction_month}
                </Text>
              ) : null}

              {(adv.report_text || adv.reason) && (
                <Text
                  style={[
                    styles.advReason,
                    { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  numberOfLines={2}
                >
                  {adv.report_text || adv.reason}
                </Text>
              )}

              <View style={[styles.advFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.advDate, { color: colors.textSecondary }]}>
                  {adv.created_at ? new Date(adv.created_at).toLocaleDateString('ar-SA') : ''}
                </Text>
                <Text style={styles.longPressHintGreen}>اضغط مطولاً للخيارات</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })
    )}
  </View>
);
