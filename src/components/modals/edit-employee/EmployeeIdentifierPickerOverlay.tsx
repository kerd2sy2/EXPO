import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { IDENTIFIER_FILTER_PLATFORMS, NormalizedIdentifier } from './editEmployeeHelpers';
import { editEmployeeStyles as styles } from './editEmployeeStyles';

interface EmployeeIdentifierPickerOverlayProps {
  visible: boolean;
  loadingIdentifiers: boolean;
  filteredIdentifiers: NormalizedIdentifier[];
  applicationId: string;
  modalAppFilter: string;
  identifierSearchText: string;
  manualIdInput: string;
  onChangeAppFilter: (appKey: string) => void;
  onChangeSearch: (v: string) => void;
  onChangeManual: (v: string) => void;
  onSelectIdentifier: (item: NormalizedIdentifier) => void;
  onApplyManual: (idValue: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

/** Bottom-sheet overlay allowing platform identifier selection or manual entry. */
export const EmployeeIdentifierPickerOverlay: React.FC<EmployeeIdentifierPickerOverlayProps> = ({
  visible,
  loadingIdentifiers,
  filteredIdentifiers,
  applicationId,
  modalAppFilter,
  identifierSearchText,
  manualIdInput,
  onChangeAppFilter,
  onChangeSearch,
  onChangeManual,
  onSelectIdentifier,
  onApplyManual,
  onClose,
  colors,
  isDarkMode,
  isRTL,
}) => {
  if (!visible) return null;

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const inputBg = isDarkMode ? '#1e293b' : '#f8fafc';

  return (
    <ModuleErrorBoundary moduleName="EmployeeIdentifierPickerOverlay" colors={colors}>
      <View style={styles.overlayContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropDismiss} activeOpacity={1} onPress={onClose} />
          <View style={[styles.pickerModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
              <View style={[styles.modalHeaderIconCircle, { backgroundColor: '#10b98118' }]}>
                <Ionicons name="id-card" size={20} color="#10b981" />
              </View>
              <View style={[styles.pickerModalTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.pickerModalTitle, { color: colors.textPrimary }]}>اختيار معرف المندوب</Text>
                <Text style={[styles.pickerModalSubtitle, { color: colors.textSecondary }]}>اختر المعرف بالاسم أو ابحث بالرقم</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.modalCloseCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalPlatformChipsWrap, { borderBottomColor: colors.border }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.modalPlatformScroll, { flexDirection: rowDir }]}
              >
                {IDENTIFIER_FILTER_PLATFORMS.map((p) => {
                  const isSelected = modalAppFilter.toLowerCase() === p.key.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.miniFilterChip,
                        { backgroundColor: isSelected ? '#10b981' : isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: isSelected ? '#10b981' : colors.border },
                      ]}
                      onPress={() => onChangeAppFilter(p.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.miniFilterChipText, { color: isSelected ? '#ffffff' : colors.textPrimary }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.pickerModalSearchWrap}>
              <View style={[styles.searchBarInner, { backgroundColor: inputBg, borderColor: colors.border, flexDirection: rowDir }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.pickerModalSearchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  value={identifierSearchText}
                  onChangeText={onChangeSearch}
                  placeholder="ابحث بالاسم أو رقم المعرف..."
                  placeholderTextColor={colors.textSecondary}
                  autoFocus={false}
                />
                {identifierSearchText ? (
                  <TouchableOpacity onPress={() => onChangeSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <ScrollView style={styles.pickerModalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
              {loadingIdentifiers ? (
                <View style={styles.emptySearchWrap}>
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text style={[styles.emptySearchSub, { color: colors.textSecondary, marginTop: 8 }]}>جاري تحميل المعرفات...</Text>
                </View>
              ) : filteredIdentifiers.length === 0 ? (
                <View style={styles.emptySearchWrap}>
                  <Ionicons name="folder-open-outline" size={36} color={colors.textSecondary} />
                  <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>لا توجد معرفات مسجلة لهذه المنصة</Text>
                  <Text style={[styles.emptySearchSub, { color: colors.textSecondary }]}>يمكنك إدخال اسم أو رقم المعرف يدويًا بالأسفل</Text>
                </View>
              ) : (
                filteredIdentifiers.map((item) => {
                  const selectedVal = item.code || item.driverName;
                  const isSelected =
                    applicationId === selectedVal ||
                    (item.code && applicationId === item.code) ||
                    (item.driverName && applicationId === item.driverName);
                  const appBadgeColor = item.appKey === 'ninja' ? '#10b981' : item.appKey === 'keeta' ? '#0284c7' : '#f59e0b';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.pickerCardItem,
                        {
                          backgroundColor: isSelected ? '#10b98112' : isDarkMode ? '#1e293b60' : '#f8fafc',
                          borderColor: isSelected ? '#10b981' : colors.border,
                          flexDirection: rowDir,
                        },
                      ]}
                      onPress={() => onSelectIdentifier(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.idCardCodeText, { color: colors.textPrimary }]}>{item.code ? item.code : item.driverName}</Text>
                        <View style={[styles.cardMetaRow, { flexDirection: rowDir }]}>
                          <View style={[styles.miniMetaBadge, { backgroundColor: `${appBadgeColor}20` }]}>
                            <Text style={[styles.miniMetaText, { color: appBadgeColor }]}>{item.appNameAr}</Text>
                          </View>
                          {item.code && item.driverName ? (
                            <Text style={[styles.plateKmText, { color: colors.textSecondary }]} numberOfLines={1}>
                              المندوب: {item.driverName}
                            </Text>
                          ) : null}
                          {item.branch ? <Text style={[styles.plateKmText, { color: colors.textSecondary }]}>فرع {item.branch}</Text> : null}
                        </View>
                      </View>
                      <View
                        style={[
                          styles.checkCircle,
                          {
                            backgroundColor: isSelected ? '#10b981' : 'transparent',
                            borderWidth: isSelected ? 0 : 1.5,
                            borderColor: isSelected ? '#10b981' : colors.border,
                          },
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.pickerModalFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.manualSectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                أو إدخال رقم المعرف يدويًا:
              </Text>
              <View style={[styles.manualInputRow, { flexDirection: rowDir }]}>
                <TextInput
                  style={[styles.manualInput, { backgroundColor: inputBg, borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  value={manualIdInput}
                  onChangeText={onChangeManual}
                  placeholder="أدخل اسم أو رقم المعرف يدويًا..."
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={[
                    styles.manualApplyBtn,
                    { backgroundColor: manualIdInput.trim() ? '#10b981' : colors.border, opacity: manualIdInput.trim() ? 1 : 0.6 },
                  ]}
                  disabled={!manualIdInput.trim()}
                  onPress={() => onApplyManual(manualIdInput.trim())}
                >
                  <Text style={styles.manualApplyBtnText}>تطبيق المعرف</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModuleErrorBoundary>
  );
};
