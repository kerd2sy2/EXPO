import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { formatImageUrl } from '../../../services/api';
import { VehicleItem } from '../../../services/operations';
import { DelegateWithStatus } from '../../../services/supervisor';
import { IdentifierPerformance } from '../../../types/target';
import {
  DELIVERY_APPS,
  DeliveryPlatformKey,
  filterVehiclesByQuery,
  getPlatformColor,
  getPlatformLabelAr,
  normalizeAndFilterIdentifiers,
  normalizePlatformKey,
} from '../edit-employee/editEmployeeHelpers';
import { qrScannerStyles as styles } from './qrScannerStyles';

interface DelegateQrLinkFormStepProps {
  delegate: DelegateWithStatus;
  vehicles: VehicleItem[];
  allIdentifiers: IdentifierPerformance[];
  branchDelegates: DelegateWithStatus[];
  loadingRefs: boolean;
  selectedPlate: string;
  onSelectPlate: (plate: string) => void;
  selectedPlatform: DeliveryPlatformKey;
  onSelectPlatform: (platform: DeliveryPlatformKey) => void;
  selectedIdentifier: string;
  onSelectIdentifier: (idCode: string) => void;
  onRescan: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const DelegateQrLinkFormStep: React.FC<DelegateQrLinkFormStepProps> = ({
  delegate,
  vehicles,
  allIdentifiers,
  branchDelegates,
  loadingRefs,
  selectedPlate,
  onSelectPlate,
  selectedPlatform,
  onSelectPlatform,
  selectedIdentifier,
  onSelectIdentifier,
  onRescan,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const [imgError, setImgError] = useState(false);
  const [plateSearch, setPlateSearch] = useState('');
  const [idSearch, setIdSearch] = useState('');

  const photoUri = useMemo(
    () => formatImageUrl(delegate.personal_image || delegate.photo_url || null),
    [delegate.personal_image, delegate.photo_url]
  );

  const originalPlate = (delegate.motorcycle_number || '').trim();
  const originalPlatform = normalizePlatformKey(delegate.application_type);
  const originalIdentifier = toEnglishDigits((delegate.application_id || '').trim());

  const sortedVehicles = useMemo(() => {
    const filtered = filterVehiclesByQuery(vehicles, plateSearch);
    const normOrig = toEnglishDigits(originalPlate).toLowerCase();
    return [...filtered].sort((a, b) => {
      const aMatch = normOrig && toEnglishDigits(a.plate_number || '').toLowerCase() === normOrig ? 0 : 1;
      const bMatch = normOrig && toEnglishDigits(b.plate_number || '').toLowerCase() === normOrig ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [vehicles, plateSearch, originalPlate]);

  const platformIdentifiers = useMemo(() => {
    const list = normalizeAndFilterIdentifiers(
      allIdentifiers,
      selectedPlatform,
      idSearch,
      branchDelegates
    );
    const matchesOrig =
      originalIdentifier &&
      originalPlatform === selectedPlatform &&
      list.some((it) => toEnglishDigits(it.code) === originalIdentifier);

    const cloned = [...list];
    if (
      originalIdentifier &&
      originalPlatform === selectedPlatform &&
      !matchesOrig &&
      (!idSearch.trim() || originalIdentifier.toLowerCase().includes(toEnglishDigits(idSearch.trim()).toLowerCase()))
    ) {
      cloned.unshift({
        id: `default_${delegate.id}_${originalIdentifier}`,
        code: originalIdentifier,
        driverName: delegate.name || '',
        appKey: selectedPlatform,
        appNameAr: getPlatformLabelAr(selectedPlatform),
        branch: delegate.branch_name,
      });
    }

    return cloned.sort((a, b) => {
      const aDef =
        originalPlatform === selectedPlatform && originalIdentifier && toEnglishDigits(a.code) === originalIdentifier
          ? 0
          : 1;
      const bDef =
        originalPlatform === selectedPlatform && originalIdentifier && toEnglishDigits(b.code) === originalIdentifier
          ? 0
          : 1;
      return aDef - bDef;
    });
  }, [allIdentifiers, selectedPlatform, idSearch, branchDelegates, originalIdentifier, originalPlatform, delegate.id, delegate.name, delegate.branch_name]);

  const trimmedPlateSearch = plateSearch.trim();
  const hasExactPlateMatch =
    trimmedPlateSearch.length > 0 &&
    vehicles.some((v) => toEnglishDigits(v.plate_number || '').toLowerCase() === toEnglishDigits(trimmedPlateSearch).toLowerCase());

  const cleanIdQuery = toEnglishDigits(idSearch.trim());
  const hasExactIdMatch =
    cleanIdQuery.length > 0 &&
    platformIdentifiers.some((it) => toEnglishDigits(it.code).toLowerCase() === cleanIdQuery.toLowerCase());

  return (
    <ScrollView
      contentContainerStyle={styles.bodyScroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Delegate Identity Card (Photo + Name) */}
      <View
        style={[
          styles.delegateSummaryCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary + '55',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={[styles.delegateAvatarWrap, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          {photoUri && !imgError ? (
            <ExpoImage
              source={{ uri: photoUri }}
              style={styles.delegateAvatarImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setImgError(true)}
            />
          ) : (
            <Ionicons name="person" size={30} color={colors.primary} />
          )}
        </View>

        <View style={[styles.delegateMetaCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.delegateName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {delegate.name}
          </Text>
          <View style={[styles.delegateBadgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {delegate.key_number ? (
              <View style={[styles.miniBadge, { backgroundColor: '#f59e0b1a' }]}>
                <Ionicons name="key" size={11} color="#d97706" />
                <Text style={[styles.miniBadgeText, { color: '#d97706' }]}>{delegate.key_number}</Text>
              </View>
            ) : null}
            {originalPlate ? (
              <View style={[styles.miniBadge, { backgroundColor: '#10b9811a' }]}>
                <Ionicons name="bicycle" size={11} color="#10b981" />
                <Text style={[styles.miniBadgeText, { color: '#10b981' }]}>{originalPlate}</Text>
              </View>
            ) : null}
            {originalPlatform !== 'unassigned' ? (
              <View style={[styles.miniBadge, { backgroundColor: getPlatformColor(originalPlatform) + '1c' }]}>
                <Text style={[styles.miniBadgeText, { color: getPlatformColor(originalPlatform) }]}>
                  {getPlatformLabelAr(originalPlatform).split(' ')[0]}
                  {originalIdentifier ? ` #${originalIdentifier}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          onPress={onRescan}
          activeOpacity={0.75}
          style={[
            styles.rescanBtn,
            { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Ionicons name="scan-outline" size={14} color={colors.primary} />
          <Text style={[styles.rescanBtnText, { color: colors.primary }]}>مسح آخر</Text>
        </TouchableOpacity>
      </View>

      {/* Section 1: Motorcycle (الدباب) */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. الدباب</Text>
          <View style={[styles.sectionBadge, { backgroundColor: selectedPlate ? '#10b9811a' : colors.border }]}>
            <Text style={[styles.sectionBadgeText, { color: selectedPlate ? '#10b981' : colors.textSecondary }]}>
              {selectedPlate || 'غير محدد'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput
            value={plateSearch}
            onChangeText={setPlateSearch}
            placeholder="ابحث برقم اللوحة أو المفتاح أو اكتب رقم دباب..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          />
          {plateSearch ? (
            <TouchableOpacity onPress={() => setPlateSearch('')}>
              <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {trimmedPlateSearch && !hasExactPlateMatch ? (
          <TouchableOpacity
            onPress={() => {
              onSelectPlate(trimmedPlateSearch);
              setPlateSearch('');
            }}
            style={[
              styles.listItemRow,
              {
                backgroundColor: colors.primary + '14',
                borderColor: colors.primary + '60',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Text style={[styles.itemPrimaryText, { color: colors.primary }]}>
              تعيين رقم الدباب يدوياً: {trimmedPlateSearch}
            </Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        {loadingRefs && vehicles.length === 0 ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 10 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsWrap}>
            {sortedVehicles.slice(0, 40).map((v) => {
              const plate = (v.plate_number || '').trim();
              const isSelected = toEnglishDigits(selectedPlate).toLowerCase() === toEnglishDigits(plate).toLowerCase();
              const isDefault = Boolean(originalPlate && toEnglishDigits(originalPlate).toLowerCase() === toEnglishDigits(plate).toLowerCase());
              return (
                <TouchableOpacity
                  key={v.id || plate}
                  onPress={() => onSelectPlate(plate)}
                  activeOpacity={0.78}
                  style={[
                    styles.vehicleChip,
                    {
                      backgroundColor: isSelected ? colors.primary + '1a' : isDarkMode ? '#0f172a' : '#f8fafc',
                      borderColor: isSelected ? colors.primary : colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="bicycle" size={15} color={isSelected ? colors.primary : colors.textSecondary} />
                  <View>
                    <Text style={[styles.itemPrimaryText, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                      {plate}
                    </Text>
                    {v.key_number ? (
                      <Text style={[styles.itemSecondaryText, { color: colors.textSecondary }]}>مفتاح {v.key_number}</Text>
                    ) : null}
                  </View>
                  {isDefault ? (
                    <View style={[styles.defaultTag, { backgroundColor: '#10b98120' }]}>
                      <Text style={[styles.defaultTagText, { color: '#10b981' }]}>افتراضي</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Section 2: Delivery Platform (كيتا / هنجر / نينجا) */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. التطبيق</Text>
          {originalPlatform !== 'unassigned' ? (
            <View style={[styles.sectionBadge, { backgroundColor: getPlatformColor(originalPlatform) + '1c' }]}>
              <Text style={[styles.sectionBadgeText, { color: getPlatformColor(originalPlatform) }]}>
                الافتراضي: {getPlatformLabelAr(originalPlatform).split(' ')[0]}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.platformRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {DELIVERY_APPS.map((app) => {
            const isSelected = selectedPlatform === app.key;
            const isDefault = originalPlatform === app.key;
            const shortLabel = app.key === 'keeta' ? 'كيتا' : app.key === 'ninja' ? 'نينجا' : 'هنجر';
            return (
              <TouchableOpacity
                key={app.key}
                onPress={() => onSelectPlatform(app.key as DeliveryPlatformKey)}
                activeOpacity={0.8}
                style={[
                  styles.platformChip,
                  {
                    backgroundColor: isSelected ? app.color + '1c' : isDarkMode ? '#0f172a' : '#f8fafc',
                    borderColor: isSelected ? app.color : colors.border,
                  },
                ]}
              >
                <Ionicons name={app.icon as any} size={20} color={isSelected ? app.color : colors.textSecondary} />
                <Text style={[styles.platformChipText, { color: isSelected ? app.color : colors.textPrimary }]}>
                  {shortLabel}
                </Text>
                {isDefault ? (
                  <View style={[styles.defaultTag, { backgroundColor: app.color + '24' }]}>
                    <Text style={[styles.defaultTagText, { color: app.color }]}>افتراضي</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Section 3: Identifiers belonging to the selected platform */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            3. معرف {getPlatformLabelAr(selectedPlatform).split(' ')[0]}
          </Text>
          <View style={[styles.sectionBadge, { backgroundColor: getPlatformColor(selectedPlatform) + '1c' }]}>
            <Text style={[styles.sectionBadgeText, { color: getPlatformColor(selectedPlatform) }]}>
              {selectedIdentifier || `${platformIdentifiers.length} معرف متاح`}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="id-card-outline" size={17} color={colors.textSecondary} />
          <TextInput
            value={idSearch}
            onChangeText={setIdSearch}
            placeholder="ابحث عن المعرف أو اكتب معرفاً جديداً..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          />
          {idSearch ? (
            <TouchableOpacity onPress={() => setIdSearch('')}>
              <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {cleanIdQuery && !hasExactIdMatch ? (
          <TouchableOpacity
            onPress={() => {
              onSelectIdentifier(cleanIdQuery);
              setIdSearch('');
            }}
            style={[
              styles.listItemRow,
              {
                backgroundColor: colors.primary + '14',
                borderColor: colors.primary + '60',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Text style={[styles.itemPrimaryText, { color: colors.primary }]}>
              اعتماد المعرف المدخل: {cleanIdQuery}
            </Text>
            <Ionicons name="add-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        {loadingRefs && platformIdentifiers.length === 0 ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 14 }} />
        ) : platformIdentifiers.length === 0 ? (
          <Text style={[styles.itemSecondaryText, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }]}>
            لا توجد معرفات مسجلة لهذا التطبيق — اكتب المعرف في الحقل أعلاه لاعتماده.
          </Text>
        ) : (
          <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }} contentContainerStyle={{ gap: 8 }}>
            {platformIdentifiers.map((it) => {
              const idValue = it.code || it.driverName;
              const isSelected = toEnglishDigits(selectedIdentifier).toLowerCase() === toEnglishDigits(idValue).toLowerCase();
              const isDefault =
                originalPlatform === selectedPlatform &&
                Boolean(originalIdentifier && toEnglishDigits(originalIdentifier).toLowerCase() === toEnglishDigits(idValue).toLowerCase());
              const accent = getPlatformColor(selectedPlatform);

              return (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => onSelectIdentifier(idValue)}
                  activeOpacity={0.78}
                  style={[
                    styles.listItemRow,
                    {
                      backgroundColor: isSelected ? accent + '18' : isDarkMode ? '#0f172a' : '#f8fafc',
                      borderColor: isSelected ? accent : colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 2 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.itemPrimaryText, { color: isSelected ? accent : colors.textPrimary }]}>
                        {it.code || it.driverName}
                      </Text>
                      {isDefault ? (
                        <View style={[styles.defaultTag, { backgroundColor: '#10b98120' }]}>
                          <Text style={[styles.defaultTagText, { color: '#10b981' }]}>افتراضي</Text>
                        </View>
                      ) : null}
                    </View>
                    {it.driverName && it.code ? (
                      <Text style={[styles.itemSecondaryText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {it.driverName}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={isSelected ? accent : colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
};
