import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { DashboardDataTab, DashboardViewType } from './targetDashboardHelpers';
import { targetDashboardHeaderStyles as styles } from './targetDashboardHeaderStyles';

interface TargetDashboardHeaderProps {
  currentView: DashboardViewType;
  activeTab: DashboardDataTab;
  subPageTitle: string;
  colors: ThemeColors;
  isRTL: boolean;
  onLogoTap: () => void;
  onOpenBranchModal: () => void;
  onOpenProfile: () => void;
  onBack: () => void;
  onResolveAllAlerts: () => void;
}

export const TargetDashboardHeader: React.FC<TargetDashboardHeaderProps> = ({
  currentView,
  activeTab,
  subPageTitle,
  colors,
  isRTL,
  onLogoTap,
  onOpenBranchModal,
  onOpenProfile,
  onBack,
  onResolveAllAlerts,
}) => {
  return (
    <View style={[styles.appHeader, { flexDirection: 'row-reverse' }]}>
      {currentView === 'home' ? (
        <>
          <TouchableOpacity
            style={[styles.headerBrandContainer, { flexDirection: 'row-reverse' }]}
            onPress={onLogoTap}
            onLongPress={onOpenBranchModal}
            delayLongPress={500}
            activeOpacity={0.7}
          >
            <View style={styles.headerBrandTextCol}>
              <Text style={[styles.headerBrandTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                AAMS
              </Text>
              <Text style={[styles.headerBrandSubtitle, { color: colors.textPrimary }]} numberOfLines={1}>
                LOGISTICS
              </Text>
            </View>
            <Image
              source={require('../../../../assets/images/logo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={onOpenProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={[styles.subPageHeaderRow, { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.subPageTitleContainer, { alignItems: 'flex-end' }]}>
            <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: 'right' }]}>
              {subPageTitle}
            </Text>
            <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
          </View>

          {currentView === 'data' && activeTab === 'alerts' ? (
            <TouchableOpacity
              style={[
                styles.resolveAllHeaderBtn,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={onResolveAllAlerts}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done-circle" size={17} color={colors.primary} />
              <Text style={[styles.resolveAllHeaderBtnText, { color: colors.primary }]}>
                تمت التسوية للجميع
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44, height: 44 }} />
          )}
        </View>
      )}
    </View>
  );
};
