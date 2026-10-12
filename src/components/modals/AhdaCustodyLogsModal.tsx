import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { CustodyLogItem } from '../../services/custodyService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AhdaCustodyLogsModalProps {
  visible: boolean;
  colors: ThemeColors;
  logs: CustodyLogItem[];
  onDeleteLog: (log: CustodyLogItem) => void;
  onClose: () => void;
}

export const AhdaCustodyLogsModal: React.FC<AhdaCustodyLogsModalProps> = ({
  visible,
  colors,
  logs,
  onDeleteLog,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bottomSheetBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 10 }]}>
          <View style={styles.sheetIndicator} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>مبالغ العهدة المضافة لليوم</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
            إذا قمت بإضافة عهدة بالخطأ، يمكنك الضغط على أيقونة الحذف لإلغائها فوراً من الحسابات:
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
            {logs.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary, marginVertical: 20 }]}>
                لا توجد حركات إضافة مسجلة لهذا اليوم
              </Text>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.logLeft}>
                    <TouchableOpacity
                      onPress={() => onDeleteLog(log)}
                      style={styles.logDeleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-start' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.logAmount, { color: '#ea580c' }]}>+{log.amount.toLocaleString()}</Text>
                        <Image
                          source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
                          style={{ width: 12, height: 12, tintColor: '#ea580c' }}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', flex: 1 }}>
                    <Text style={[styles.logDesc, { color: colors.textPrimary }]}>{log.description}</Text>
                    <Text style={[styles.logAdmin, { color: colors.textSecondary }]}>بواسطة: {log.admin_name || 'المسؤول'}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  logRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  logDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  logTime: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  logDesc: {
    fontSize: 13,
    fontWeight: '700',
  },
  logAdmin: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
