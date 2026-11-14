import { StyleSheet } from 'react-native';

export const fieldStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  tabsRow: {
    gap: 8,
    marginBottom: 10,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  tabLbl: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  searchBar: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  delegateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  cardTopRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  keyBox: {
    minWidth: 48,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 2,
  },
  keyNumberText: {
    fontSize: 13,
    fontWeight: '900',
  },
  delegateName: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusLine: {
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commButtons: {
    alignItems: 'center',
    gap: 6,
  },
  commBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoStrip: {
    borderRadius: 11,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    justifyContent: 'space-around',
  },
  infoCell: {
    alignItems: 'center',
    flex: 1,
  },
  infoCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoCellValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  overrideBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  overrideBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  submitOverrideBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  submitOverrideBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
