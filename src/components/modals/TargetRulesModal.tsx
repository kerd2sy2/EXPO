import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TargetRulesModalProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

export const TargetRulesModal: React.FC<TargetRulesModalProps> = ({
  visible,
  onClose,
  colors,
  isDarkMode = false,
  isRTL = true,
}) => {
  const handleShareRules = async () => {
    try {
      const documentText = `📜 [وثيقة وقواعد احتساب التارچت والتوقع - AAMS Logistics]
===================================================

🎯 1. المفهوم الأساسي ومستهدفات التشغيل:
• التارچت الشهري للمعرف: 460 طلباً / شهر.
• التارچت اليومي المطلوب كمعيار: 18 طلباً / يوم (مبني على 25-26 يوم عمل فعلي في الشهر مع احتساب أيام الراحة الأسبوعية).
• الأيام المنقضية والمتبقية: تُقاس بدقة بناءً على أحدث تاريخ شيت مسجل ومرفوع في الشهر لضمان عدم احتساب الأيام القادمة كعجز تشغيلي.

📈 2. معادلة التوقع الشهري الذكية (Adaptive Blended Run Rate):
• المعادلة التراكمية للشهر: المعدل اليومي = إجمالي طلبات الشهر ÷ الأيام المنقضية.
• معادلة الزخم الأخير: معدل آخر 7 أيام = طلبات الأسبوع ÷ 7.
• المعدل الموزون المركب: (65% × المعدل التراكمي) + (35% × معدل الزخم الأخير).
• التوقع بنهاية الشهر = الطلبات الفعلية الحالية + (المعدل الموزون × الأيام المتبقية في الشهر).
💡 الهدف: حماية المندوب من انهيار توقعه عند أخذ إجازة أسبوعية مستحقة، وضمان عدم تضخيمه إذا طرأ ضغط مؤقت في يوم واحد.

🏷️ 3. معايير تصنيف الحالات الأربعة:
🔵 حقق التارچت (TARGET_ACHIEVED):
- أنجز بالفعل 460 طلباً أو أكثر خلال الشهر.

🟢 في معدل التارچت (ON_TRACK):
- التوقع بنهاية الشهر 460 طلباً فأكثر.
- أو يواكب وتيرة الشهر بنجاح والمطلوب منه متبقياً 18 طلباً أو أقل يومياً.

🟡 على وشك المعدل (AT_RISK):
- التوقع بنهاية الشهر بين 390 و 459 طلباً (أكثر من 85% من التارچت).
- أو المطلوب منه يومياً للتعويض ما زال واقعياً وفي المتناول (أقل من 20.5 طلب/يوم).

🔴 متأخر عن التارچت (BEHIND_TARGET):
- التوقع بنهاية الشهر أقل من 390 طلباً، والمطلوب منه يومياً لتعويض الفارق يفوق 21 طلباً/يوم بسبب انخفاض الإنتاجية أو الغياب.

===================================================
صدرت هذه الوثيقة كمعيار تشغيلي وإداري رسمي معتمد في AAMS.`;

      if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(documentText);
      }
      await Share.share({
        title: 'وثيقة قواعد التارچت والتوقع - AAMS',
        message: documentText,
      });
    } catch (err) {
      console.log('Share rules err:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.headerIconBox, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff' }]}>
                <Ionicons name="document-text" size={22} color="#3b82f6" />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  وثيقة قواعد التارچت والتوقع
                </Text>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                  المنهجية الرياضية والمعايير الرسمية المعتمدة
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Action Card: Share / Copy */}
            <TouchableOpacity
              style={[styles.shareActionCard, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={handleShareRules}
              activeOpacity={0.8}
            >
              <View style={[styles.shareIconWrap, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="share-social-outline" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.shareActionTitle, { color: isDarkMode ? '#93c5fd' : '#1d4ed8' }]}>
                  مشاركة أو نسخ نص الوثيقة
                </Text>
                <Text style={[styles.shareActionSub, { color: colors.textSecondary }]}>
                  إرسال المرجع والقواعد الرسمية للمشرفين والمناديب
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#3b82f6" />
            </TouchableOpacity>

            {/* Section 1: Philosophy & Numbers */}
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#fafafa', borderColor: colors.border }]}>
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="flag-outline" size={20} color="#3b82f6" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  1. مفهوم التارچت ومعايير التشغيل
                </Text>
              </View>

              <View style={styles.rulesList}>
                <View style={[styles.ruleItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.bullet, { backgroundColor: '#3b82f6' }]} />
                  <Text style={[styles.ruleText, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    <Text style={styles.boldText}>التارچت الشهري (460 طلباً): </Text>
                    هو المعيار الأساسي المعتمد للمعرف في دورة الشهر الواحدة.
                  </Text>
                </View>

                <View style={[styles.ruleItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.bullet, { backgroundColor: '#3b82f6' }]} />
                  <Text style={[styles.ruleText, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    <Text style={styles.boldText}>التارچت اليومي المعياري (18 طلباً): </Text>
                    يُبنى على افتراض 25 إلى 26 يوم عمل نشط شهرياً (مع إعطاء 4 إلى 5 أيام راحة أسبوعية مشروعة للمندوب).
                  </Text>
                </View>

                <View style={[styles.ruleItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.bullet, { backgroundColor: '#3b82f6' }]} />
                  <Text style={[styles.ruleText, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    <Text style={styles.boldText}>حساب الأيام المنقضية: </Text>
                    يتم الربط بدقة مع <Text style={styles.boldText}>آخر تاريخ شيت تم رفعه</Text> (مثلاً اليوم 12)، ولا يُحسب باقي أيام الشهر كأيام غياب بل كأيام متبقية للتعويض.
                  </Text>
                </View>
              </View>
            </View>

            {/* Section 2: Mathematical Projection Formula */}
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#fafafa', borderColor: colors.border }]}>
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="calculator-outline" size={20} color="#10b981" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  2. معادلة التوقع الشهري (Adaptive Run Rate)
                </Text>
              </View>

              <Text style={[styles.descText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                التوقع لا يعتمد على التخمين أو أيام عشوائية، بل يعتمد على نموذج تكيفي موزون يحمي السائق ويمنح الإدارة تنبؤاً دقيقاً:
              </Text>

              <View style={[styles.formulaBox, { backgroundColor: isDarkMode ? '#111827' : '#f3f4f6', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
                <Text style={styles.formulaTitle}>المعادلة الرياضية المعتمدة:</Text>
                <Text style={styles.formulaEquation}>
                  المعدل الموزون = (65% × معدل الشهر) + (35% × معدل آخر 7 أيام)
                </Text>
                <Text style={[styles.formulaEquation, { marginTop: 6, color: '#10b981', fontWeight: '700' }]}>
                  التوقع الشهري = الطلبات الحالية + (المعدل الموزون × الأيام المتبقية)
                </Text>
              </View>

              <View style={[styles.whyBox, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4', borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : '#bbf7d0' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10b981" style={{ marginTop: 1 }} />
                <Text style={[styles.whyText, { color: isDarkMode ? '#86efac' : '#166534', textAlign: isRTL ? 'right' : 'left', flex: 1 }]}>
                  <Text style={{ fontWeight: '700' }}>ميزة المعادلة: </Text>
                  إذا أخذ المندوب راحة يوم أو يومين في الأسبوع، فإن وزنه التراكمي للشهر (65%) يمنع توقعه من الانهيار، وإذا حقق ضغطاً مؤقتاً في يومين فإن وزنه لا يتضخم بشكل وهمي.
                </Text>
              </View>
            </View>

            {/* Section 3: Status Classification */}
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#fafafa', borderColor: colors.border }]}>
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="pie-chart-outline" size={20} color="#8b5cf6" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  3. معايير تصنيف الحالات الأربعة
                </Text>
              </View>

              {/* Status 1: TARGET_ACHIEVED */}
              <View style={[styles.statusCard, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe' }]}>
                <View style={[styles.statusHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.statusBadge, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.statusBadgeText}>حقق التارچت</Text>
                  </View>
                  <Text style={[styles.statusCondition, { color: isDarkMode ? '#93c5fd' : '#1d4ed8' }]}>
                    الطلبات الفعلية ≥ 460 طلب
                  </Text>
                </View>
                <Text style={[styles.statusDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المعرف استوفى كامل المستهدف الشهري المطلوب ودخل في نطاق المكافآت والتميز الإضافي.
                </Text>
              </View>

              {/* Status 2: ON_TRACK */}
              <View style={[styles.statusCard, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4', borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0' }]}>
                <View style={[styles.statusHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.statusBadge, { backgroundColor: '#22c55e' }]}>
                    <Text style={styles.statusBadgeText}>يسير بالمعدل</Text>
                  </View>
                  <Text style={[styles.statusCondition, { color: isDarkMode ? '#86efac' : '#15803d' }]}>
                    التوقع المتوقع ≥ 460 طلب
                  </Text>
                </View>
                <Text style={[styles.statusDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المعرف يسير بوتيرة ممتازة تضمن تحقيقه للتارچت، أو يسبق خطة الشهر وطلباته المطلوبة يومياً أقل من أو تساوي 18 طلباً.
                </Text>
              </View>

              {/* Status 3: AT_RISK */}
              <View style={[styles.statusCard, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb', borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.35)' : '#fde68a' }]}>
                <View style={[styles.statusHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.statusBadgeText}>على وشك المعدل</Text>
                  </View>
                  <Text style={[styles.statusCondition, { color: isDarkMode ? '#fde047' : '#b45309' }]}>
                    التوقع بين 390 و 459 طلباً
                  </Text>
                </View>
                <Text style={[styles.statusDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المعرف قريب جداً من التارچت (حقق 85% فأكثر من الوتيرة المطلوبة)، أو يحتاج لزيادة طفيفة وممكنة (مطلوب يومي ≤ 20.5 طلب).
                </Text>
              </View>

              {/* Status 4: BEHIND_TARGET */}
              <View style={[styles.statusCard, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2', borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca' }]}>
                <View style={[styles.statusHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.statusBadge, { backgroundColor: '#ef4444' }]}>
                    <Text style={styles.statusBadgeText}>متأخر</Text>
                  </View>
                  <Text style={[styles.statusCondition, { color: isDarkMode ? '#fca5a5' : '#b91c1c' }]}>
                    التوقع أقل من 390 طلباً
                  </Text>
                </View>
                <Text style={[styles.statusDetail, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المعرف متأخر بفارق كبير عن الخطة التشغيلية، ومعدل التعويض المطلوب يومياً يفوق الطاقة الطبيعية (أكثر من 21 طلباً/يوم).
                </Text>
              </View>
            </View>

            {/* Section 4: Real-World Scenarios */}
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#fafafa', borderColor: colors.border }]}>
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="stats-chart-outline" size={20} color="#6366f1" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  4. أمثلة رقمية حية (اليوم 12 من 30 يوماً)
                </Text>
              </View>

              <View style={styles.exampleCard}>
                <Text style={[styles.exampleHeading, { color: colors.textPrimary }]}>• الحالة الأولى: مندوب أداءه قوي (فهد)</Text>
                <Text style={[styles.exampleBody, { color: colors.textSecondary }]}>
                  أنجز 283 طلباً في 12 يوماً (معدل 23.6 طلب/يوم) ➔ متبقي له 177 طلباً فقط في 18 يوماً ➔ المطلوب منه فقط 9.8 طلب/يوم ➔ توقعه الشهري 608 طلبات ➔ <Text style={{ color: '#22c55e', fontWeight: '700' }}>يسير بالمعدل (ON_TRACK)</Text>.
                </Text>
              </View>

              <View style={styles.exampleCard}>
                <Text style={[styles.exampleHeading, { color: colors.textPrimary }]}>• الحالة الثانية: مندوب في المنطقة الرمادية (إبراهيم)</Text>
                <Text style={[styles.exampleBody, { color: colors.textSecondary }]}>
                  أنجز 181 طلباً في 12 يوماً (معدل 15.1 طلب/يوم) ➔ متبقي له 279 طلباً في 18 يوماً ➔ المطلوب منه 15.5 طلب/يوم ➔ توقعه الشهري 455 طلباً ➔ <Text style={{ color: '#f59e0b', fontWeight: '700' }}>على وشك المعدل (AT_RISK)</Text>.
                </Text>
              </View>

              <View style={styles.exampleCard}>
                <Text style={[styles.exampleHeading, { color: colors.textPrimary }]}>• الحالة الثالثة: مندوب متأخر (اسور)</Text>
                <Text style={[styles.exampleBody, { color: colors.textSecondary }]}>
                  أنجز 20 طلباً فقط في 12 يوماً ➔ متبقي له 440 طلباً في 18 يوماً ➔ المطلوب منه 24.4 طلب/يوم ➔ توقعه الشهري 50 طلباً ➔ <Text style={{ color: '#ef4444', fontWeight: '700' }}>متأخر (BEHIND_TARGET)</Text>.
                </Text>
              </View>
            </View>

            {/* Bottom Note */}
            <View style={[styles.footerNote, { borderColor: colors.border }]}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.footerNoteText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                تعتمد هذه القواعد كمرجع تشغيلي موحد لجميع شاشات التارچت، التقارير، ولوحات المتابعة في نظام AAMS.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  shareActionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  shareIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareActionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  shareActionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  rulesList: {
    gap: 10,
  },
  ruleItem: {
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  ruleText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
  },
  descText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  formulaBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  formulaTitle: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  formulaEquation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#3b82f6',
    textAlign: 'center',
    lineHeight: 20,
  },
  whyBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    alignItems: 'flex-start',
  },
  whyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  statusHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCondition: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  exampleCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  exampleHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  exampleBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  footerNoteText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
