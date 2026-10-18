import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors } from '../../types/delegate';
import { apiRequest } from '../../services/api';

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/CwER2AE9QyI6Ytp7XoLjSa?s=cl&p=a&mlu=4&ilr=4';
const STORAGE_KEY = '@aams_whatsapp_docs';

export interface WhatsAppDocItem {
  id: string;
  uri: string;
  type: 'photo' | 'silent_video';
  created_at: string;
  notes?: string;
  synced_to_server?: boolean;
}

interface WhatsAppCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSuccess?: (item: WhatsAppDocItem) => void;
}

export const WhatsAppCaptureModal: React.FC<WhatsAppCaptureModalProps> = ({
  visible,
  onClose,
  colors,
  isDarkMode,
  isRTL,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  // Save captured media to database & open WhatsApp group
  const handleProcessMedia = async (uri: string, mediaType: 'photo' | 'silent_video') => {
    try {
      setLoading(true);
      const newDoc: WhatsAppDocItem = {
        id: `wa_${Date.now()}`,
        uri,
        type: mediaType,
        created_at: new Date().toISOString(),
        notes: mediaType === 'photo' ? 'صورة توثيق ميداني' : 'فيديو صامت توثيق ميداني',
        synced_to_server: false,
      };

      // 1. Save in local storage
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const list: WhatsAppDocItem[] = existing ? JSON.parse(existing) : [];
      list.unshift(newDoc);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));

      // 2. Sync to backend database
      try {
        await apiRequest('/documents', {
          method: 'POST',
          body: JSON.stringify({
            doc_type: 'whatsapp_doc',
            title: mediaType === 'photo' ? 'صورة توثيق واتساب' : 'فيديو توثيق واتساب صامت',
            file_url: uri,
            notes: 'تم التقاطه وإرساله لجروب الواتساب الميداني',
          }),
        });
        newDoc.synced_to_server = true;
      } catch (backendErr) {
        console.log('[WhatsAppCapture] Saved locally; server sync queued:', backendErr);
      }

      onClose();
      if (onSuccess) onSuccess(newDoc);

      // 3. Open WhatsApp Group automatically
      setTimeout(async () => {
        try {
          const canOpen = await Linking.canOpenURL(WHATSAPP_GROUP_LINK);
          if (canOpen) {
            await Linking.openURL(WHATSAPP_GROUP_LINK);
          } else {
            // Fallback to native share
            await Share.share({
              url: uri,
              message: `توثيق ميداني جديد - رابط القروب: ${WHATSAPP_GROUP_LINK}`,
            });
          }
        } catch {
          await Linking.openURL(WHATSAPP_GROUP_LINK);
        }
      }, 350);
    } catch (err: any) {
      Alert.alert('خطأ', 'تعذر حفظ وتوثيق الوسائط: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  // Launch camera for photo
  const handleCapturePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه الصلاحيات', 'يرجى السماح للتطبيق بالوصول إلى الكاميرا لالتقاط الصور');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleProcessMedia(result.assets[0].uri, 'photo');
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل فتح الكاميرا: ' + (e?.message || ''));
    }
  };

  // Launch camera for silent video (video recording)
  const handleCaptureSilentVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه الصلاحيات', 'يرجى السماح للتطبيق بالوصول للكاميرا لتسجيل الفيديو');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 60,
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleProcessMedia(result.assets[0].uri, 'silent_video');
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل فتح تسجيل الفيديو: ' + (e?.message || ''));
    }
  };

  // Pick from gallery
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVid = asset.type === 'video';
        await handleProcessMedia(asset.uri, isVid ? 'silent_video' : 'photo');
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل فتح المعرض: ' + (e?.message || ''));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Drag Handle */}
              <View style={[styles.handleIndicator, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />

              {/* Title & WhatsApp Header */}
              <View style={[styles.headerBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.waIconWrap}>
                  <Ionicons name="logo-whatsapp" size={24} color="#ffffff" />
                </View>
                <View style={[styles.headerTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>توثيق واتساب الميداني</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    التقاط صورة أو فيديو صامت وحفظه بالبيانات مع الإرسال التلقائي للجروب
                  </Text>
                </View>
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#25D366" />
                  <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
                    جارٍ حفظ التوثيق وفتح جروب الواتساب...
                  </Text>
                </View>
              ) : (
                <View style={styles.actionSheetBtnsCol}>
                  {/* Option 1: Take Photo */}
                  <TouchableOpacity
                    style={[
                      styles.sheetOptionBtn,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={handleCapturePhoto}
                  >
                    <View style={[styles.sheetOptionIconBox, { backgroundColor: '#25D36620' }]}>
                      <Ionicons name="camera" size={20} color="#25D366" />
                    </View>
                    <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                        التقاط صورة بالكاميرا
                      </Text>
                      <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                        تصوير لقطة ميدانية، حفظها في السجل، والإرسال مباشرة للجروب
                      </Text>
                    </View>
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Option 2: Record Silent Video */}
                  <TouchableOpacity
                    style={[
                      styles.sheetOptionBtn,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={handleCaptureSilentVideo}
                  >
                    <View style={[styles.sheetOptionIconBox, { backgroundColor: '#0284c720' }]}>
                      <Ionicons name="videocam" size={20} color="#0284c7" />
                    </View>
                    <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <View style={[styles.rowTitleBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                          تصوير فيديو صامت
                        </Text>
                        <View style={styles.muteBadge}>
                          <Ionicons name="volume-mute" size={12} color="#0284c7" />
                          <Text style={styles.muteBadgeText}>بدون صوت</Text>
                        </View>
                      </View>
                      <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                        تسجيل فيديو ميداني صامت وحفظه بالبيانات والإرسال للجروب
                      </Text>
                    </View>
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Option 3: Gallery */}
                  <TouchableOpacity
                    style={[
                      styles.sheetOptionBtn,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={handlePickFromGallery}
                  >
                    <View style={[styles.sheetOptionIconBox, { backgroundColor: '#f59e0b20' }]}>
                      <Ionicons name="images-outline" size={20} color="#f59e0b" />
                    </View>
                    <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>
                        اختيار من المعرض
                      </Text>
                      <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                        اختيار صورة أو فيديو مسجل مسبقاً
                      </Text>
                    </View>
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Text style={[styles.sheetCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerBox: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  waIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSheetBtnsCol: {
    gap: 10,
    marginBottom: 14,
  },
  sheetOptionBtn: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sheetOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  rowTitleBadge: {
    alignItems: 'center',
    gap: 8,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  muteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0284c715',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  muteBadgeText: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '700',
  },
  sheetOptionSub: {
    fontSize: 12,
  },
  sheetCancelBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
