import { StyleSheet } from 'react-native';

export const targetDashboardContentStyles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  itemTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identAvatarTitleGroup: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  identPlatformAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  identNinjaAvatarImg: {
    width: 32,
    height: 32,
  },
  identToyouAvatarImg: {
    width: 35,
    height: 35,
  },
  identKeetaAvatarImg: {
    width: 44,
    height: 44,
  },
  itemTitleGroup: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemCode: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexShrink: 0,
    minWidth: 68,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 0,
  },
  itemProgressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  itemProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemProgressPct: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 35,
    textAlign: 'right',
  },
  itemMetricsRow: {
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  itemMetricCol: {
    alignItems: 'center',
  },
  itemMetricVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemMetricLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  qualificationRow: {
    alignItems: 'center',
    gap: 4,
  },
  qualificationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tapDetailsGroup: {
    alignItems: 'center',
    gap: 2,
  },
  tapDetailsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  driverAvatarRow: {
    alignItems: 'center',
    gap: 10,
  },
  driverAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  driverBadgeNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  driverBadgeLbl: {
    fontSize: 9,
  },
  tagRow: {
    alignItems: 'center',
    gap: 6,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertNumsRow: {
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  alertNumText: {
    fontSize: 12,
  },
  alertDriverRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  alertDriverText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resolveBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  resolveBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  appBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  platformTabsBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  platformTabItem: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformTabItemActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  platformTabItemText: {
    fontSize: 12,
    fontWeight: '700',
  },
  platformTabItemTextActive: {
    fontWeight: '800',
    color: '#ffffff',
  },
  platformTabLogo: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  platformCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
