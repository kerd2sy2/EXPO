import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccountStatus } from '../../../types/target';
import { formatIdentifierTitleName } from './identifierDetailsHelpers';
import { identifierDetailsMainStyles as mainStyles } from './identifierDetailsMainStyles';
import { identifierDetailsModalStyles as styles } from './identifierDetailsModalStyles';

interface AccountStatusSheetModalProps {
  visible: boolean;
  isDarkMode: boolean;
  statusUpdating: boolean;
  currentAccountStatus: AccountStatus;
  identifierName?: string;
  onClose: () => void;
  onSelectStatus: (status: AccountStatus) => void;
}

export const AccountStatusSheetModal: React.FC<AccountStatusSheetModalProps> = ({
  visible,
  isDarkMode,
  statusUpdating,
  currentAccountStatus,
  identifierName,
  onClose,
  onSelectStatus,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => !statusUpdating && onClose()}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !statusUpdating && onClose()} />
        <View style={[styles.statusDialogBox, isDarkMode && styles.darkDialogBox]}>
          <View style={[styles.statusDragHandle, isDarkMode && { backgroundColor: '#475569' }]} />
          <View style={styles.dialogHeader}>
            <Text style={[styles.dialogTitle, isDarkMode && mainStyles.darkText]}>تعديل حالة تشغيل المعرف</Text>
            <TouchableOpacity onPress={onClose} disabled={statusUpdating} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={isDarkMode ? '#fff' : '#475569'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.dialogSubTitle, isDarkMode && styles.darkSubText]}>
            اختر الحالة التشغيلية للمعرف ({identifierName ? formatIdentifierTitleName(identifierName) : ''})
          </Text>

          <TouchableOpacity
            style={[
              styles.statusOptionCard,
              currentAccountStatus === 'ACTIVE' && styles.statusOptionCardSelected,
              isDarkMode && styles.darkOptionCard,
            ]}
            onPress={() => onSelectStatus('ACTIVE')}
            disabled={statusUpdating}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeaderRow}>
              <View style={styles.optionLeftGroup}>
                <View style={[styles.optionDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.optionTitle, isDarkMode && mainStyles.darkText]}>نشط (ACTIVE)</Text>
              </View>
              {currentAccountStatus === 'ACTIVE' && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
            </View>
            <Text style={[styles.optionDesc, isDarkMode && styles.darkSubText]}>
              الحساب نشط ويستقبل الطلبات وتُحتسب إنجازاته بشكل طبيعي في التارچت.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusOptionCard,
              currentAccountStatus === 'SUSPENDED_TEMP' && styles.statusOptionCardSelectedTemp,
              isDarkMode && styles.darkOptionCard,
            ]}
            onPress={() => onSelectStatus('SUSPENDED_TEMP')}
            disabled={statusUpdating}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeaderRow}>
              <View style={styles.optionLeftGroup}>
                <View style={[styles.optionDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={[styles.optionTitle, isDarkMode && mainStyles.darkText]}>موقوف مؤقتاً (SUSPENDED_TEMP)</Text>
              </View>
              {currentAccountStatus === 'SUSPENDED_TEMP' && <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />}
            </View>
            <Text style={[styles.optionDesc, isDarkMode && styles.darkSubText]}>
              تجميد المعرف مؤقتاً لحين استئناف العمل لاحقاً بقرار الإدارة.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusOptionCard,
              currentAccountStatus === 'SUSPENDED_PERM' && styles.statusOptionCardSelectedPerm,
              isDarkMode && styles.darkOptionCard,
            ]}
            onPress={() => onSelectStatus('SUSPENDED_PERM')}
            disabled={statusUpdating}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeaderRow}>
              <View style={styles.optionLeftGroup}>
                <View style={[styles.optionDot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.optionTitle, isDarkMode && mainStyles.darkText]}>🛑 موقوف نهائياً (SUSPENDED_PERM)</Text>
              </View>
              {currentAccountStatus === 'SUSPENDED_PERM' && <Ionicons name="checkmark-circle" size={20} color="#ef4444" />}
            </View>
            <Text style={[styles.optionDesc, isDarkMode && styles.darkSubText]}>
              إيقاف الحساب نهائياً؛ لن يتم إضافة أو احتساب أي طلبات جديدة لهذا المعرف مستقبلاً.
            </Text>
          </TouchableOpacity>

          <View style={[styles.modalNoticeBox, isDarkMode && styles.modalNoticeBoxDark]}>
            <Ionicons name="shield-checkmark-outline" size={17} color={isDarkMode ? '#34d399' : '#059669'} />
            <Text style={[styles.modalNoticeText, isDarkMode && styles.modalNoticeTextDark]}>
              تنبيه: الإيقاف ينطبق على حساب المعرف فقط، ولا يؤثر على المناديب حيث يمكنهم العمل على أي حسابات أخرى.
            </Text>
          </View>

          {statusUpdating && (
            <View style={styles.updatingLoader}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={styles.updatingText}>جارٍ حفظ التغييرات...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
