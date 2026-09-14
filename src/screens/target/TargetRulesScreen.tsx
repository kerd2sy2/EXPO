import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface TargetRulesScreenProps {
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  onBack?: () => void;
  onOpenTargetSettings?: () => void;
}

export const TargetRulesScreen: React.FC<TargetRulesScreenProps> = ({
  colors,
  isDarkMode = false,
  isRTL = true,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Banner */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.heroBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.systemBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={[styles.systemBadgeText, { color: colors.primary }]}>
                المعايير التشغيلية المعتمدة
              </Text>
            </View>
            <View style={[styles.dotPill, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <Text style={[styles.dotPillText, { color: colors.textSecondary }]}>
                AAMS Logistics
              </Text>
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            معايير وقواعد احتساب التارچت
          </Text>
          <Text style={[styles.heroDescription, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            الضوابط الرسمية المعتمدة لحساب التوقع الشهري، ومعدلات الإنجاز اليومية، وتصنيف أداء المعرفين عبر منصات التشغيل (كيتا ونينجا).
          </Text>

          {/* Quick Metrics 4-Box Grid */}
          <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* KPI 1: Monthly Target */}
            <View style={[styles.kpiItem, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[styles.kpiValue, { color: colors.primary }]}>460</Text>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلب / شهر</Text>
              <Text style={[styles.kpiSub, { color: colors.textPrimary }]}>التارچت الشهري</Text>
            </View>

            {/* KPI 2: Daily Target */}
            <View style={[styles.kpiItem, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[styles.kpiValue, { color: '#10b981' }]}>18</Text>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلب / يوم</Text>
              <Text style={[styles.kpiSub, { color: colors.textPrimary }]}>المعدل اليومي</Text>
            </View>

            {/* KPI 3: Formula Weights */}
            <View style={[styles.kpiItem, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[styles.kpiValue, { color: '#3b82f6' }]}>65% / 35%</Text>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>تراكمي + زخم</Text>
              <Text style={[styles.kpiSub, { color: colors.textPrimary }]}>معادلة التوقع</Text>
            </View>

            {/* KPI 4: Classification Levels */}
            <View style={[styles.kpiItem, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>4</Text>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>مستويات</Text>
              <Text style={[styles.kpiSub, { color: colors.textPrimary }]}>تصنيف الأداء</Text>
            </View>
          </View>
        </View>

        {/* 2. Section: المستهدفات والمعايير التشغيلية */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.sectionIconCircle, { backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.16)' : '#ffedd5' }]}>
              <Ionicons name="flag" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                1. المستهدفات والضوابط الأساسية
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                القيم المعتمدة لاحتساب حجم العمل والأيام التشغيلية
              </Text>
            </View>
          </View>

          <View style={styles.rulesList}>
            {/* Rule item 1 */}
            <View style={[styles.ruleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.ruleBadgeNum, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.ruleBadgeNumText, { color: colors.textPrimary }]}>1</Text>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.ruleHeadText, { color: colors.textPrimary }]}>
                  التارچت الشهري المعتمد (460 طلباً)
                </Text>
                <Text style={[styles.ruleBodyText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  هو المعيار الرسمي المعتمد للمعرف الواحد خلال دورة الشهر التقويمي لتحقيق الاستحقاق الكامل للمستهدف.
                </Text>
              </View>
            </View>

            {/* Rule item 2 */}
            <View style={[styles.ruleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.ruleBadgeNum, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.ruleBadgeNumText, { color: colors.textPrimary }]}>2</Text>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.ruleHeadText, { color: colors.textPrimary }]}>
                  المعدل اليومي المعياري (18 طلباً / يوم)
                </Text>
                <Text style={[styles.ruleBodyText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  محسوب على أساس 25 إلى 26 يوم عمل نشط شهرياً، مع مراعاة 4 إلى 5 أيام راحة أسبوعية مستحقة دون أن تؤدي لانخفاض التقييم.
                </Text>
              </View>
            </View>

            {/* Rule item 3 */}
            <View style={[styles.ruleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.ruleBadgeNum, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.ruleBadgeNumText, { color: colors.textPrimary }]}>3</Text>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.ruleHeadText, { color: colors.textPrimary }]}>
                  آلية احتساب الأيام المنقضية والمتبقية
                </Text>
                <Text style={[styles.ruleBodyText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  يتم الربط بدقة وفق أحدث تاريخ كشف تشغيلي تم رفعه في الشهر. ولا تُحتسب الأيام اللاحقة له كأيام عجز بل كفرص عمل متبقية للتعويض.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Section: معادلة احتساب التوقع */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.sectionIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff' }]}>
              <Ionicons name="calculator" size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                2. نموذج معادلة التوقع التراكمي
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                حساب رياضي موزون يجمع بين استقرار الشهر وزخم الأداء الأخير
              </Text>
            </View>
          </View>

          {/* Formula Display Box */}
          <View
            style={[
              styles.formulaContainer,
              {
                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <Text style={[styles.formulaHeaderTitle, { color: colors.textSecondary }]}>
              المعادلة الحسابية المعتمدة في النظام:
            </Text>
            <View style={styles.formulaEquationWrap}>
              <Text style={[styles.formulaPart, { color: '#3b82f6' }]}>
                المعدل اليومي الموزون = (65% × معدل الشهر التراكمي) + (35% × معدل آخر 7 أيام)
              </Text>
              <View style={styles.formulaDivider} />
              <Text style={[styles.formulaResult, { color: '#10b981' }]}>
                التوقع بنهاية الشهر = الطلبات المنفذة فعلياً + (المعدل الموزون × الأيام المتبقية)
              </Text>
            </View>
          </View>

          {/* Explanation of Weights */}
          <View style={styles.weightsExplanationBlock}>
            {/* Weight 1: 65% Cumulative */}
            <View
              style={[
                styles.weightItemBox,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={[styles.weightBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Text style={[styles.weightBadgeText, { color: '#3b82f6' }]}>65%</Text>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.weightItemTitle, { color: colors.textPrimary }]}>
                  المعدل التراكمي للشهر (مؤشر الاستقرار والعدالة)
                </Text>
                <Text style={[styles.weightItemBody, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  يحسب متوسط إنتاجية المعرف على مدار كافة أيام الشهر المنقضية. الهدف منه: حماية المعرف؛ فحين يأخذ يوم أو يومين راحة أسبوعية مستحقة، يمنع هذا الوزن الثقيل توقعه من الانهيار المفاجئ، ويعكس التزامه الإجمالي طوال الشهر.
                </Text>
              </View>
            </View>

            {/* Weight 2: 35% Recent Momentum */}
            <View
              style={[
                styles.weightItemBox,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={[styles.weightBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={[styles.weightBadgeText, { color: '#10b981' }]}>35%</Text>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.weightItemTitle, { color: colors.textPrimary }]}>
                  معدل الزخم لآخر 7 أيام (مؤشر الاستجابة والتعويض)
                </Text>
                <Text style={[styles.weightItemBody, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  يحسب وتيرة الأداء والنشاط الفعلي خلال الأسبوع الأخير. الهدف منه: سرعة استجابة النظام للمعرف الذي يكثف جهده لتعويض ما فاته، ليرتفع توقعه مباشرة في لوحة التحكم ويتحول تصنيفه إلى المسار المطلوب فور تحسن وتيرته الحالية.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Section: مصفوفة تصنيف حالات الأداء */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.sectionIconCircle, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.16)' : '#f5f3ff' }]}>
              <Ionicons name="pie-chart" size={18} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                3. معايير تصنيف حالات الأداء
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                المستويات الأربعة المعتمدة في مؤشرات لوحة التحكم والتنبيهات
              </Text>
            </View>
          </View>

          {/* Level 1: TARGET_ACHIEVED */}
          <View style={[styles.statusMatrixCard, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.10)' : '#eff6ff', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe' }]}>
            <View style={[styles.statusMatrixHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.statusPillBadge, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="trophy" size={13} color="#ffffff" />
                <Text style={styles.statusPillBadgeText}>حقق التارچت</Text>
              </View>
              <Text style={[styles.statusConditionText, { color: isDarkMode ? '#93c5fd' : '#1d4ed8' }]}>
                الطلبات الفعلية ≥ 460 طلب
              </Text>
            </View>
            <Text style={[styles.statusMatrixDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              استوفى المعرف كامل المستهدف الشهري المطلوب خلال الشهر، ويدخل في نطاق التميز ومؤشرات الحوافز الإضافية.
            </Text>
          </View>

          {/* Level 2: ON_TRACK */}
          <View style={[styles.statusMatrixCard, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.10)' : '#f0fdf4', borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0' }]}>
            <View style={[styles.statusMatrixHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.statusPillBadge, { backgroundColor: '#22c55e' }]}>
                <Ionicons name="trending-up" size={13} color="#ffffff" />
                <Text style={styles.statusPillBadgeText}>يسير بالمعدل</Text>
              </View>
              <Text style={[styles.statusConditionText, { color: isDarkMode ? '#86efac' : '#15803d' }]}>
                التوقع بنهاية الشهر ≥ 460 طلب
              </Text>
            </View>
            <Text style={[styles.statusMatrixDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              يسير المعرف بوتيرة ممتازة تضمن تحقيق التارچت في موعده، أو يسبق وتيرة الشهر والمطلوب منه يومياً لا يتجاوز المعدل المعياري (≤ 18 طلباً).
            </Text>
          </View>

          {/* Level 3: AT_RISK */}
          <View style={[styles.statusMatrixCard, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.10)' : '#fffbeb', borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.35)' : '#fde68a' }]}>
            <View style={[styles.statusMatrixHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.statusPillBadge, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="alert-circle" size={13} color="#ffffff" />
                <Text style={styles.statusPillBadgeText}>على وشك التارچت</Text>
              </View>
              <Text style={[styles.statusConditionText, { color: isDarkMode ? '#fde047' : '#b45309' }]}>
                التوقع بين 390 و 459 طلباً
              </Text>
            </View>
            <Text style={[styles.statusMatrixDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              أنجز المعرف ما يزيد عن 85% من الوتيرة المطلوبة، أو المطلوب منه يومياً للتعويض ما زال في المتناول (≤ 20.5 طلب/يوم) ويحتاج دفعة متابعة بسيطة.
            </Text>
          </View>

          {/* Level 4: BEHIND_TARGET */}
          <View style={[styles.statusMatrixCard, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.10)' : '#fef2f2', borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca' }]}>
            <View style={[styles.statusMatrixHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.statusPillBadge, { backgroundColor: '#ef4444' }]}>
                <Ionicons name="close-circle" size={13} color="#ffffff" />
                <Text style={styles.statusPillBadgeText}>متأخر عن التارچت</Text>
              </View>
              <Text style={[styles.statusConditionText, { color: isDarkMode ? '#fca5a5' : '#b91c1c' }]}>
                التوقع أقل من 390 طلباً
              </Text>
            </View>
            <Text style={[styles.statusMatrixDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              التوقع يقل عن 390 طلباً ومعدل التعويض المطلوب يومياً يفوق الطاقة الطبيعية (أكثر من 21 طلباً/يوم). يُدرج المعرف تلقائياً في تنبيهات المتابعة للمعالجة.
            </Text>
          </View>
        </View>

        {/* 5. Section: منصات التشغيل المدعومة */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.sectionIconCircle, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5' }]}>
              <Ionicons name="cube" size={18} color="#10b981" />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                4. تطبيقات ومنصات التوصيل
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                المنصات المشمولة في كشوفات التشغيل واحتساب التارچت
              </Text>
            </View>
          </View>

          <View style={[styles.platformsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Keeta Platform */}
            <View style={[styles.platformCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
              <View style={[styles.platformIconDot, { backgroundColor: '#eab308' }]} />
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.platformName, { color: colors.textPrimary }]}>منصة كيتا (Keeta)</Text>
                <Text style={[styles.platformDesc, { color: colors.textSecondary }]}>مطابقة معرفات التشغيل وطلبات الكشوفات اليومية</Text>
              </View>
            </View>

            {/* Ninja Platform */}
            <View style={[styles.platformCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
              <View style={[styles.platformIconDot, { backgroundColor: isDarkMode ? '#ffffff' : '#0f172a' }]} />
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.platformName, { color: colors.textPrimary }]}>منصة نينجا (Ninja)</Text>
                <Text style={[styles.platformDesc, { color: colors.textSecondary }]}>مطابقة طلبات التوصيل وساعات التشغيل المعتمدة</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer info note */}
        <View style={[styles.footerNoteWrap, { borderColor: colors.border }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.footerNoteText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            تُطبق هذه المعايير رسمياً عبر كافة واجهات لوحة التحكم، والتقارير اليومية، وتنبيهات المتابعة الإدارية في نظام AAMS.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  heroBadgeRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  systemBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dotPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dotPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  kpiGrid: {
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  rulesList: {
    gap: 12,
  },
  ruleRow: {
    gap: 10,
    alignItems: 'flex-start',
  },
  ruleBadgeNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  ruleBadgeNumText: {
    fontSize: 12,
    fontWeight: '800',
  },
  ruleHeadText: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  ruleBodyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  formulaContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  formulaHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  formulaEquationWrap: {
    gap: 8,
    alignItems: 'center',
  },
  formulaPart: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  formulaDivider: {
    height: 1,
    width: '60%',
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  formulaResult: {
    fontSize: 12.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  weightsExplanationBlock: {
    gap: 10,
  },
  weightItemBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    alignItems: 'flex-start',
  },
  weightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  weightBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  weightItemTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 3,
  },
  weightItemBody: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  statusMatrixCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  statusMatrixHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillBadgeText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  statusConditionText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  statusMatrixDesc: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  platformsRow: {
    gap: 10,
  },
  platformCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  platformIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  platformName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  platformDesc: {
    fontSize: 10.5,
    marginTop: 2,
  },
  footerNoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  footerNoteText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
