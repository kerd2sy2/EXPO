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
  const [dailyTarget, setDailyTarget] = useState('17');
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
      setDailyTarget(String(res.default_daily_target || 17));
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل إعدادات التارچت');
    } finally {
      setLoading(false);
    }
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
      Alert.alert('نجاح', 'تم تحديث إعدادات التارچت بنجاح');
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'فشل في حفظ إعدادات التارچت');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isDarkMode && styles.darkCard]}>
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
                onChangeText={setMonthlyTarget}
                placeholder="460"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <Text style={styles.label}>التارچت اليومي الافتراضي (طلب/يوم)</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                keyboardType="numeric"
                value={dailyTarget}
                onChangeText={setDailyTarget}
                placeholder="17"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              <Text style={styles.hint}>
                * هذه القيم تطبق تلقائياً كقيم افتراضية للمعرفين الجدد وتستخدم في حسابات التنبؤ والتنبيهات.
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
});
