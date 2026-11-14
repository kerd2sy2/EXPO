import { StyleSheet } from 'react-native';

export const historyStyles = StyleSheet.create({
  tabContainer: {
    padding: 16,
    gap: 14,
  },
  // Month Cards List
  monthsList: {
    gap: 12,
  },
  monthCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  monthCardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthCardHeaderLeft: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  monthIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  monthCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  currentMonthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  currentMonthBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  monthCardShiftsCount: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  navCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthStatsRow: {
    gap: 8,
  },
  monthStatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  monthStatChipVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  monthStatChipLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Dedicated Month Page
  monthPageContainer: {
    gap: 14,
  },
  monthPageTopBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthPageTitleGroup: {
    flex: 1,
  },
  monthPageTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  monthPageSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Shifts List
  shiftsList: {
    gap: 10,
  },
  shiftItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  shiftItemTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftItemDateLeft: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shiftItemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftItemDateTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  shiftItemTimeSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  statusPillBadge: {
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shiftMetricsBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricColumn: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  metricLabelRow: {
    alignItems: 'center',
    gap: 4,
  },
  metricColumnLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricColumnValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricColDivider: {
    width: 1,
    height: 24,
  },
  supervisorEditBadge: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  supervisorEditText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Empty State
  emptyStateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
