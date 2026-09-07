import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { targetApi } from '../../services/targetApi';

interface TargetSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  isDarkMode?: boolean;
}

export const TargetSettingsModal: React.FC<TargetSettingsModalProps> = ({
  visible,
  onClose,
  onSaved,
  isDarkMode = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState('460');
  const [dailyTarget, setDailyTarget] = useState('18');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await targetApi.getTargetSettings();
      setMonthlyTarget(String(res.default_monthly_target || 460));
      setDailyTarget(String(res.default_daily_target || 18));
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل إعدادات التارچت');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthlyTargetChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setMonthlyTarget(clean);
  };

  const handleDailyTargetChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setDailyTarget(clean);
  };

  const handleSave = async () => {
    const m = parseInt(monthlyTarget, 10);
    const d = parseInt(dailyTarget, 10);

    if (isNaN(m) || m <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال تارچت شهري صحيح');
      return;
    }
    if (isNaN(d) || d <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال تارچت يومي صحيح');
      return;
    }

    try {
      setSaving(true);
      await targetApi.updateTargetSettings({
        default_monthly_target: m,
        default_daily_target: d,
      });
      Alert.alert('نجاح', 'تم تحديث إعدادات التارچت بنجاح وتطبيقها على جميع المعرفين');
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'فشل في حفظ إعدادات التارچت');
    } finally {
      setSaving(false);
    }
  };

  const [deletingAll, setDeletingAll] = useState(false);

  const handleDeleteAllIdentifiers = () => {
    Alert.alert(
      'تأكيد مسح كافة المعرفات',
      'هل أنت متأكد من رغبتك في مسح كافة المعرفات والبيانات المسجلة بالكامل؟\n\nستتمكن بعد ذلك من رفع شيتات وبيانات جديدة تماماً من الصفر.\n\n⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، مسح الكل الآن',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAll(true);
              await targetApi.deleteAllIdentifiers();
              Alert.alert('تم بنجاح', 'تم مسح كافة المعرفات والبيانات بنجاح. يمكنك الآن رفع الداتا الجديدة.');
              onSaved();
              onClose();
            } catch (err: any) {
              Alert.alert('خطأ', err.message || 'فشل في مسح المعرفات');
            } finally {
              setDeletingAll(false);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.card, isDarkMode && styles.darkCard]}>
          <View style={[styles.dragHandle, isDarkMode && { backgroundColor: '#475569' }]} />
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={isDarkMode ? '#fff' : '#1e293b'} />
            </TouchableOpacity>
            <Text style={[styles.title, isDarkMode && styles.darkText]}>إعدادات التارچت الافتراضي</Text>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color="#f97316" />
              <Text style={styles.loadingText}>جارٍ تحميل الإعدادات...</Text>
            </View>
          ) : (
            <View style={styles.body}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.label}>التارچت الشهري الافتراضي للمعرف (طلب/شهر)</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                keyboardType="numeric"
                value={monthlyTarget}
                onChangeText={handleMonthlyTargetChange}
                placeholder="460"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <Text style={styles.label}>التارچت اليومي المحسوب (طلب/يوم - بالتقريب لأقرب رقم صحيح)</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                keyboardType="numeric"
                value={dailyTarget}
                onChangeText={handleDailyTargetChange}
                placeholder="15"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <Text style={styles.hint}>
                * يتم حساب التارجت اليومي تلقائياً بالتقريب كرقم صحيح بدون كسور (تارجت الشهر ÷ 30).
              </Text>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>
                )}
              </TouchableOpacity>

              {/* قسم إعادة تعيين وبدء داتا جديدة */}
              <View style={[styles.dangerSection, isDarkMode && styles.darkDangerSection]}>
                <View style={styles.dangerHeaderRow}>
                  <Ionicons name="trash-bin-outline" size={18} color="#ef4444" />
                  <Text style={styles.dangerTitle}>إعادة تعيين وبدء داتا جديدة</Text>
                </View>
                <Text style={styles.dangerHint}>
                  إذا كنت ترغب في إدخال بيانات من أول وجديد ورفع شيتات جديدة، يمكنك مسح كافة المعرفات والبيانات الحالية بضغطة زر.
                </Text>

                <TouchableOpacity
                  style={[styles.deleteAllBtn, deletingAll && styles.disabledBtn]}
                  onPress={handleDeleteAllIdentifiers}
                  disabled={deletingAll}
                  activeOpacity={0.8}
                >
                  {deletingAll ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View style={styles.deleteAllBtnContent}>
                      <Ionicons name="trash" size={16} color="#fff" />
                      <Text style={styles.deleteAllBtnText}>مسح كافة المعرفات والبيانات</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 38,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  darkCard: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 4,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
  },
  body: {
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'right',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  darkInput: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 12,
    marginBottom: 18,
    textAlign: 'right',
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  dangerSection: {
    marginTop: 18,
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    borderRadius: 14,
    padding: 14,
  },
  darkDangerSection: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  dangerHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e11d48',
    textAlign: 'right',
  },
  dangerHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'right',
    lineHeight: 16,
    marginBottom: 12,
  },
  deleteAllBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAllBtnContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  deleteAllBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
