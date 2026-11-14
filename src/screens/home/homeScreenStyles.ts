import { StyleSheet } from 'react-native';

export const homeScreenStyles = StyleSheet.create({
  tabContainer: {
    padding: 16,
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  celebrationLottieWrap: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationLottie: {
    width: '100%',
    height: '100%',
  },
  celebrationContent: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  celebrationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  celebrationTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ca8a04',
  },
  celebrationTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  celebrationSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  targetCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  targetCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  targetRatioText: {
    fontSize: 13,
    fontWeight: '600',
  },
  targetRatioBold: {
    fontWeight: '800',
  },
  targetProgressContainer: {
    marginBottom: 10,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetFooterNotice: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  targetFooterPct: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 1,
  },
  salaryAmountRow: {
    alignItems: 'center',
    gap: 3,
    marginBottom: 1,
  },
  riyalSymbolImg: {
    width: 14,
    height: 14,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  originalBikeNotice: {
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
  },
  quickCardRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  quickCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTextCol: {
    flex: 1,
  },
  quickCardTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardSub: {
    fontSize: 12,
  },
});
