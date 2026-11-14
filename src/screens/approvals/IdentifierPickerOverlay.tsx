import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { approvalsModalStyles as styles } from './approvalsModalStyles';
import { IdentifierDropdownItem } from './approvalsHelpers';

interface IdentifierPickerOverlayProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  loadingIdentifiers: boolean;
  filteredIdentifiers: IdentifierDropdownItem[];
  editedAppId: string;
  identifierAppFilter: string;
  identifierSearchText: string;
  manualIdInput: string;
  onChangeAppFilter: (appKey: string) => void;
  onChangeSearchText: (text: string) => void;
  onChangeManualInput: (text: string) => void;
  onSelectAppId: (appId: string) => void;
  onClose: () => void;
}

const PLATFORM_CHIPS = [
  { key: 'ALL', label: 'الكل' },
  { key: 'keeta', label: 'كيتا (Keeta)' },
  { key: 'ninja', label: 'نينجا (Ninja)' },
  { key: 'hungerstation', label: 'هنقرستيشن' },
];

export const IdentifierPickerOverlay: React.FC<IdentifierPickerOverlayProps> = ({
  colors,
  isDarkMode,
  isRTL,
  loadingIdentifiers,
  filteredIdentifiers,
  editedAppId,
  identifierAppFilter,
  identifierSearchText,
  manualIdInput,
  onChangeAppFilter,
  onChangeSearchText,
  onChangeManualInput,
  onSelectAppId,
  onClose,
}) => (
  <View style={styles.overlayContainer}>
    <TouchableOpacity
      style={styles.backdropDismiss}
      activeOpacity={1}
      onPress={onClose}
    />
    <View
      style={[
        styles.pickerModalCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Picker Header */}
      <View
        style={[
          styles.pickerModalHeader,
          {
            borderBottomColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={[styles.modalHeaderIconCircle, { backgroundColor: '#10b98118' }]}>
          <Ionicons name="id-card" size={20} color="#10b981" />
        </View>
        <View style={[styles.pickerModalTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.pickerModalTitle, { color: colors.textPrimary }]}>
            اختيار معرف المندوب
          </Text>
          <Text style={[styles.pickerModalSubtitle, { color: colors.textSecondary }]}>
            اختر المعرف بالاسم أو ابحث بالرقم
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.modalCloseCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Platform Filter Chips */}
      <View style={[styles.modalPlatformChipsWrap, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.modalPlatformScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {PLATFORM_CHIPS.map((p) => {
            const isSelected = identifierAppFilter.toLowerCase() === p.key.toLowerCase();
            return (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.miniFilterChip,
                  {
                    backgroundColor: isSelected ? '#10b981' : isDarkMode ? '#1e293b' : '#f1f5f9',
                    borderColor: isSelected ? '#10b981' : colors.border,
                  },
                ]}
                onPress={() => onChangeAppFilter(p.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.miniFilterChipText,
                    { color: isSelected ? '#ffffff' : colors.textPrimary },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.pickerModalSearchWrap}>
        <View
          style={[
            styles.searchBarInner,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[
              styles.pickerModalSearchInput,
              {
                color: colors.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            value={identifierSearchText}
            onChangeText={onChangeSearchText}
            placeholder="ابحث بالاسم أو رقم المعرف..."
            placeholderTextColor={colors.textSecondary}
          />
          {identifierSearchText ? (
            <TouchableOpacity onPress={() => onChangeSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Identifiers List */}
      <ScrollView
        style={styles.pickerModalScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {loadingIdentifiers ? (
          <View style={styles.emptySearchWrap}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={[styles.emptySearchSub, { color: colors.textSecondary, marginTop: 8 }]}>
              جاري تحميل المعرفات...
            </Text>
          </View>
        ) : filteredIdentifiers.length === 0 ? (
          <View style={styles.emptySearchWrap}>
            <Ionicons name="folder-open-outline" size={36} color={colors.textSecondary} />
            <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>
              لا توجد معرفات مسجلة لهذه المنصة
            </Text>
            <Text style={[styles.emptySearchSub, { color: colors.textSecondary }]}>
              يمكنك إدخال اسم أو رقم المعرف يدويًا بالأسفل
            </Text>
          </View>
        ) : (
          filteredIdentifiers.map((item) => {
            const selectedVal = item.code || item.driverName;
            const isSelected = editedAppId === selectedVal || (item.code && editedAppId === item.code);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.pickerCardItem,
                  {
                    backgroundColor: isSelected
                      ? '#10b98112'
                      : isDarkMode
                      ? '#1e293b60'
                      : '#f8fafc',
                    borderColor: isSelected ? '#10b981' : colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => {
                  onSelectAppId(item.code || item.driverName);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.pickerItemRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View
                    style={[
                      styles.pickerItemBadgeCircle,
                      {
                        backgroundColor: isSelected ? '#10b981' : colors.primary + '18',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark' : 'id-card'}
                      size={16}
                      color={isSelected ? '#ffffff' : colors.primary}
                    />
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={[styles.codeAndBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.pickerItemCode, { color: colors.textPrimary }]}>
                        {item.code || '---'}
                      </Text>
                      <View style={[styles.pickerAppPill, { backgroundColor: '#10b98118' }]}>
                        <Text style={styles.pickerAppPillText}>
                          {item.appNameAr}
                        </Text>
                      </View>
                    </View>
                    {item.driverName ? (
                      <Text style={[styles.pickerItemDriverName, { color: colors.textSecondary }]}>
                        المندوب: {item.driverName}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.selectedCheckWrap}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Manual Input Footer */}
      <View style={[styles.manualPickerFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.manualInputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          أو كتابة المعرف يدويًا
        </Text>
        <View style={[styles.manualInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TextInput
            style={[
              styles.manualTextInput,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                borderColor: colors.border,
                color: colors.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            value={manualIdInput}
            onChangeText={onChangeManualInput}
            placeholder="أدخل رقم أو اسم المعرف..."
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={[
              styles.manualApplyBtn,
              {
                backgroundColor: manualIdInput.trim() ? '#10b981' : colors.border,
              },
            ]}
            disabled={!manualIdInput.trim()}
            onPress={() => {
              onSelectAppId(manualIdInput.trim());
              onClose();
            }}
          >
            <Text style={styles.manualApplyBtnText}>تطبيق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);
