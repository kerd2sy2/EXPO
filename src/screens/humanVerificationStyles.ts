import { Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const HV_TRACK_WIDTH = Math.min(SCREEN_WIDTH - 48, 330);
export const HV_KNOB_SIZE = 50;
export const HV_MAX_SLIDE = HV_TRACK_WIDTH - HV_KNOB_SIZE - 8;

export const humanVerificationStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  animationSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullLottie: {
    width: '100%',
    height: '100%',
    maxHeight: 340,
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  errorBox: {
    width: '100%',
    maxWidth: HV_TRACK_WIDTH,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorContentRow: {
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  sliderSection: {
    alignItems: 'center',
    width: '100%',
  },
  track: {
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 29,
  },
  trackLabel: {
    fontSize: 13,
    fontWeight: '700',
    zIndex: 1,
  },
  knob: {
    position: 'absolute',
    left: 4,
    width: HV_KNOB_SIZE,
    height: HV_KNOB_SIZE,
    borderRadius: HV_KNOB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 2,
  },
  trustFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
