import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import InAppVideoPlayer from '../InAppVideoPlayer';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { DelegateWithStatus, OperationVideo } from '../../services/supervisor';
import { operationVideoStyles as styles } from './operationVideoStyles';

interface OperationVideoSubModalsProps {
  playingVideoUrl: string | null;
  onClosePlayer: () => void;
  onOpenExternal: () => void;
  editingVideo: OperationVideo | null;
  editOrderNumber: string;
  editNotes: string;
  savingEdit: boolean;
  onChangeEditOrder: (v: string) => void;
  onChangeEditNotes: (v: string) => void;
  onSaveEdit: () => void;
  onCloseEdit: () => void;
  showRecordSheet: boolean;
  branchDelegates: DelegateWithStatus[];
  selectedDelegateId: string;
  newOrderNumber: string;
  newNotes: string;
  uploading: boolean;
  onSelectDelegate: (id: string) => void;
  onChangeNewOrder: (v: string) => void;
  onChangeNewNotes: (v: string) => void;
  onSaveUpload: () => void;
  onCloseRecordSheet: () => void;
  colors: ThemeColors;
  isRTL: boolean;
}

/** Nested modals for playback, metadata editing, and new video upload. */
export const OperationVideoSubModals: React.FC<OperationVideoSubModalsProps> = ({
  playingVideoUrl,
  onClosePlayer,
  onOpenExternal,
  editingVideo,
  editOrderNumber,
  editNotes,
  savingEdit,
  onChangeEditOrder,
  onChangeEditNotes,
  onSaveEdit,
  onCloseEdit,
  showRecordSheet,
  branchDelegates,
  selectedDelegateId,
  newOrderNumber,
  newNotes,
  uploading,
  onSelectDelegate,
  onChangeNewOrder,
  onChangeNewNotes,
  onSaveUpload,
  onCloseRecordSheet,
  colors,
  isRTL,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <>
      <Modal visible={!!playingVideoUrl} transparent={false} animationType="fade" onRequestClose={onClosePlayer}>
        <ModuleErrorBoundary moduleName="VideoPlayerModal" colors={colors}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
            <View style={[styles.playerHeader, { flexDirection: rowDir }]}>
              <TouchableOpacity style={styles.playerCloseBtn} onPress={onClosePlayer}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.playerTitle}>مشاهدة توثيق الفيديو</Text>
              <TouchableOpacity style={styles.externalBtn} onPress={onOpenExternal}>
                <Ionicons name="open-outline" size={18} color="#f59e0b" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#000000' }}>
              {playingVideoUrl && <InAppVideoPlayer url={playingVideoUrl} />}
            </View>
          </SafeAreaView>
        </ModuleErrorBoundary>
      </Modal>

      <Modal visible={!!editingVideo} transparent animationType="fade" onRequestClose={onCloseEdit}>
        <ModuleErrorBoundary moduleName="EditVideoModal" colors={colors}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>تعديل بيانات الفيديو</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>رقم الطلب (اختياري)</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                value={editOrderNumber}
                onChangeText={onChangeEditOrder}
                placeholder="مثال: 94821"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>الملاحظات</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg, height: 75 }]}
                value={editNotes}
                onChangeText={onChangeEditNotes}
                placeholder="اكتب ملاحظات التوثيق..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <View style={[styles.modalButtonsRow, { flexDirection: rowDir }]}>
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={onSaveEdit} disabled={savingEdit}>
                  {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>حفظ التعديلات</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={onCloseEdit}>
                  <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ModuleErrorBoundary>
      </Modal>

      <Modal visible={showRecordSheet} transparent animationType="slide" onRequestClose={onCloseRecordSheet}>
        <ModuleErrorBoundary moduleName="RecordUploadVideoSheet" colors={colors}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={[styles.recordReadyBadge, { backgroundColor: '#10b98118' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 13 }}>تم التقاط الفيديو وجاهز للرفع</Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>المندوب المرتبط بالفيديو</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                {branchDelegates.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.delegatePill, selectedDelegateId === d.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => onSelectDelegate(d.id)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: selectedDelegateId === d.id ? '#fff' : colors.textPrimary }}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>رقم الطلب</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                value={newOrderNumber}
                onChangeText={onChangeNewOrder}
                placeholder="أدخل رقم الطلب إذا توفر"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>ملاحظات</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg, height: 70 }]}
                value={newNotes}
                onChangeText={onChangeNewNotes}
                placeholder="تفاصيل التوثيق..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <View style={[styles.modalButtonsRow, { flexDirection: rowDir }]}>
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={onSaveUpload} disabled={uploading}>
                  {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>رفع وتأكيد التوثيق</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={onCloseRecordSheet}>
                  <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ModuleErrorBoundary>
      </Modal>
    </>
  );
};
