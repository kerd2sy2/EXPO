import { StyleSheet } from 'react-native';

export const targetDashboardPlatformStyles = StyleSheet.create({
  dateFilterPillBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  dateFilterIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterTextCol: {
    flex: 1,
    gap: 2,
  },
  dateFilterTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  dateFilterTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dateFilterActiveBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateFilterActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateFilterSub: {
    fontSize: 11,
  },
  dateFilterChangeBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateFilterChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateFilterResetBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformsSummaryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  platformsCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  platformsCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformsCardTitleGroup: {
    flex: 1,
    gap: 2,
  },
  platformsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  platformsCardSubtitle: {
    fontSize: 11,
  },
  platformsCardActionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
  },
  platformsCardActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  platformsChipsRow: {
    gap: 8,
  },
  platformMiniChip: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  miniLogoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniLogoImg: {
    width: 18,
    height: 18,
  },
  miniChipName: {
    fontSize: 11,
    fontWeight: '800',
  },
  miniChipVal: {
    fontSize: 10,
    fontWeight: '700',
  },
  platformDateTextCol: {
    flex: 1,
    gap: 1,
  },
  platformDateSubTitle: {
    fontSize: 11,
    marginBottom: 1,
  },
  platformDatePillBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  platformDateIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformDateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  platformDateChangeBadge: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  platformDateChangeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  platformVerticalList: {
    gap: 12,
    marginTop: 6,
  },
  platformVerticalCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  platformCardLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  platformCardLogoImg: {
    width: 36,
    height: 36,
  },
  platformKeetaImg: {
    width: 52,
    height: 52,
  },
  platformCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  platformCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  platformCardSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  platformCardOrdersCol: {
    alignItems: 'center',
    minWidth: 70,
  },
  platformCardOrdersNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  platformCardOrdersLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  platformsCleanScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  platformsCleanList: {
    flex: 1,
  },
  platformCleanSection: {
    paddingVertical: 10,
  },
  platformCleanHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  platformHeaderLeft: {
    alignItems: 'center',
    gap: 14,
  },
  platformCleanLogoBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  platformCleanLogoImg: {
    width: 40,
    height: 40,
  },
  platformCleanKeetaImg: {
    width: 52,
    height: 52,
  },
  platformCleanTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  platformCleanSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  platformIdentsBadge: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  platformIdentsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  platformStatsBlock: {
    gap: 14,
  },
  platformMainStatsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  platformStatItem: {
    flex: 1,
    gap: 4,
  },
  platformStatLabelRow: {
    alignItems: 'center',
    gap: 6,
  },
  platformStatLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  platformStatValueLarge: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  platformVerticalDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 16,
  },
  platformStatusRow: {
    gap: 12,
    marginTop: 4,
  },
  platformStatusCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextCol: {
    flex: 1,
  },
  statusCountText: {
    fontSize: 20,
    fontWeight: '900',
  },
  statusNameText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  platformSimpleDivider: {
    height: 1,
    width: '100%',
    marginVertical: 24,
  },
});
