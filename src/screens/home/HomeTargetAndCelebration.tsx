import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemeColors } from '../../types/delegate';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { homeScreenStyles as styles } from './homeScreenStyles';

interface HomeTargetAndCelebrationProps {
  totalApprovedOrdersCount: number;
  monthlyTarget: number;
  isTargetAchieved: boolean;
  targetProgressPct: number;
  remainingOrdersToTarget: number;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onShowCelebration?: () => void;
}

export const HomeTargetAndCelebration: React.FC<HomeTargetAndCelebrationProps> = React.memo(({
  totalApprovedOrdersCount,
  monthlyTarget,
  isTargetAchieved,
  targetProgressPct,
  remainingOrdersToTarget,
  colors,
  isDarkMode,
  isRTL,
  t,
  onShowCelebration,
}) => (
  <>
    {totalApprovedOrdersCount >= 460 && (
      <ModuleErrorBoundary moduleName="بانر الاحتفال بالهدف" colors={colors}>
        <TouchableOpacity
          style={[
            styles.celebrationBanner,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#fefce8',
              borderColor: isDarkMode ? 'rgba(234, 179, 8, 0.45)' : '#fde047',
            },
          ]}
          onPress={onShowCelebration}
          activeOpacity={0.85}
        >
          <View style={styles.celebrationLottieWrap}>
            <LottieView
              source={require('../../../assets/Lottie/lottie/GpI0uQYnKa.lottie')}
              autoPlay
              loop
              style={styles.celebrationLottie}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.celebrationContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={styles.celebrationTag}>
              <Ionicons name="sparkles" size={13} color="#ca8a04" />
              <Text style={styles.celebrationTagText}>تم تحقيق التارجت 460+ طلب 🎉</Text>
            </View>
            <Text style={[styles.celebrationTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              أداء استثنائي يا بطل!
            </Text>
            <Text style={[styles.celebrationSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              أنجزت {totalApprovedOrdersCount} طلب هذا الشهر • تم تفعيل شريحة 6 ريال للطلب
            </Text>
          </View>
        </TouchableOpacity>
      </ModuleErrorBoundary>
    )}

    <ModuleErrorBoundary moduleName="كرت الهدف الشهري" colors={colors}>
      <View style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.targetCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.targetTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="flag-outline" size={17} color={colors.primary} />
            <Text style={[styles.targetCardTitle, { color: colors.textPrimary }]}>
              {t.monthlyTarget || 'الهدف الشهري'}
            </Text>
          </View>
          <Text style={[styles.targetRatioText, { color: colors.textSecondary }]}>
            <Text style={[styles.targetRatioBold, { color: colors.primary }]}>{totalApprovedOrdersCount}</Text>{' '}
            {t.ofRatio || 'من'} {monthlyTarget} {t.ordersUnit || 'طلب'}
          </Text>
        </View>

        <View style={styles.targetProgressContainer}>
          <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.max(2, targetProgressPct)}%`,
                  backgroundColor: isTargetAchieved ? '#22c55e' : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.targetFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.targetFooterNotice,
              { color: isTargetAchieved ? '#22c55e' : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={1}
          >
            {isTargetAchieved
              ? t.targetAchievedBadge || 'تم تحقيق الهدف الشهري بنجاح 🎉'
              : t.targetRemainingNotice
                ? t.targetRemainingNotice.replace('{n}', String(remainingOrdersToTarget))
                : `متبقي ${remainingOrdersToTarget} طلب للوصول للهدف`}
          </Text>
          <Text style={[styles.targetFooterPct, { color: isTargetAchieved ? '#22c55e' : colors.primary }]}>
            {targetProgressPct}%
          </Text>
        </View>
      </View>
    </ModuleErrorBoundary>
  </>
));
