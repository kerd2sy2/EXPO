import { StyleSheet } from 'react-native';

export const ahdaNetCustodyCardStyles = StyleSheet.create({
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  targetCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  targetCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  targetCardDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  targetCardHint: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    marginTop: 1,
  },
  targetNetValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  targetNetUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  targetProgressContainer: {
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  detailColLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
    textAlign: 'center',
  },
  detailColValue: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  detailColUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  detailDivider: {
    width: 1,
    height: 26,
    alignSelf: 'center',
  },
  miniLogLink: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#047857',
    textDecorationLine: 'underline',
    marginTop: 2,
    textAlign: 'center',
  },
  dateRowContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  dateDotSeparator: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.45,
    marginHorizontal: 1,
  },
  relativeLabelContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  relativeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  relativeLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
