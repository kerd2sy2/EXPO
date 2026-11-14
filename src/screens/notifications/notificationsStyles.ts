import { Platform, StyleSheet } from 'react-native';

export const notificationsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlArea: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  markReadRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitleGroup: {
    gap: 3,
  },
  notifPageTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  unreadSummaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markReadHeaderBtn: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  markReadHeaderBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  notificationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  titleBadgeRow: {
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  delegateName: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAgoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  cardFooterRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  clearSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  clearSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#94a3b860',
    marginBottom: 8,
  },
  clearSheetIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  clearSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  clearSheetDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  clearSheetBtnRow: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  clearSheetConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  clearSheetConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  clearSheetCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
