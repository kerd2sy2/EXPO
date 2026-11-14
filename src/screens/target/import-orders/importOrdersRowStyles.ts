import { StyleSheet } from 'react-native';

export const importOrdersRowStyles = StyleSheet.create({
  emptyIdentRowCard: {
    borderColor: '#fdba74',
    backgroundColor: '#fffaf5',
  },
  emptyIdentText: {
    color: '#0369a1',
    fontWeight: '800',
  },
  tableSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'right',
  },
  rowCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dupRowCard: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffaf5',
  },
  rowTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMeta: {
    alignItems: 'flex-end',
  },
  rowIdent: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  rowDriver: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
  },
  ordersBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ordersBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c2410c',
  },
  rowBottom: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rowSub: {
    fontSize: 11,
    color: '#64748b',
  },
  dupTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
  },
  appBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  appBadgeNinja: {
    backgroundColor: '#ecfdf5',
  },
  appBadgeKeeta: {
    backgroundColor: '#fef3c7',
  },
  appBadgeToyo: {
    backgroundColor: '#eff6ff',
  },
  appBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  appBadgeNinjaText: {
    color: '#059669',
  },
  appBadgeKeetaText: {
    color: '#d97706',
  },
  appBadgeToyoText: {
    color: '#2563eb',
  },
});
