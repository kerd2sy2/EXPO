import { useCallback } from 'react';
import { Alert, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { custodyService, CustodyDayData, CustodyExpenseItem } from '../../services/custodyService';
import {
  exportCustodyDayToPdf,
  invalidateCustodyPdfCache,
  evictImageCache,
} from '../../services/custodyPdfService';
import { compressPickedImage, getDaysCacheKey } from './ahdaHomeHelpers';

async function pickCompressedReceiptImage(useCamera: boolean): Promise<string | null> {
  Keyboard.dismiss();
  const perm = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (perm.status !== 'granted') {
    Alert.alert(
      'إذن مطلوب',
      useCamera ? 'يرجى السماح للتطبيق باستخدام الكاميرا لتصوير الفاتورة' : 'يرجى السماح للتطبيق بالوصول للصور'
    );
    return null;
  }

  const pickerFn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await pickerFn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
  Keyboard.dismiss();

  if (!result.canceled && result.assets[0]?.uri) {
    return compressPickedImage(result.assets[0].uri);
  }
  return null;
}

export function useAhdaCustodyMediaActions({
  currentUser,
  selectedDate,
  bId,
  dayLogs,
  currentDay,
  effectiveOpeningBalance,
  activeStoredLedger,
  setActiveStoredLedger,
  setDays,
  setAlertConfig,
  setInvoiceImageUri,
  setEditImageUri,
  setExportingExcel,
}: any) {
  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      const compressedUri = await pickCompressedReceiptImage(useCamera);
      if (compressedUri) {
        setInvoiceImageUri(compressedUri);
        setTimeout(() => Keyboard.dismiss(), 50);
        setTimeout(() => Keyboard.dismiss(), 200);
      }
    } catch (err) {
      console.warn('Error picking image:', err);
    }
  };

  const handlePickEditImage = async (useCamera: boolean = false) => {
    try {
      const compressedUri = await pickCompressedReceiptImage(useCamera);
      if (compressedUri) {
        setEditImageUri(compressedUri);
        setTimeout(() => Keyboard.dismiss(), 50);
        setTimeout(() => Keyboard.dismiss(), 200);
      }
    } catch (err) {
      console.warn('Error picking edit image:', err);
    }
  };

  const handleReorderExpenses = useCallback(
    (reorderedExpenses: CustodyExpenseItem[]) => {
      setDays((prevDays: CustodyDayData[]) =>
        prevDays.map((d) => (d.date === selectedDate ? { ...d, expenses: reorderedExpenses } : d))
      );
      AsyncStorage.getItem(getDaysCacheKey(bId))
        .then((cachedStr) => {
          if (cachedStr) {
            try {
              const parsed: CustodyDayData[] = JSON.parse(cachedStr);
              const updated = parsed.map((d) =>
                d.date === selectedDate ? { ...d, expenses: reorderedExpenses } : d
              );
              AsyncStorage.setItem(getDaysCacheKey(bId), JSON.stringify(updated)).catch(() => {});
            } catch (_) {}
          }
        })
        .catch(() => {});
    },
    [selectedDate, bId, setDays]
  );

  const handleExportPdf = async (mode: 'preview' | 'share' = 'share') => {
    if (!currentDay) {
      Alert.alert('تنبيه', 'لا توجد بيانات عهدة مسجلة لتصديرها لهذا اليوم');
      return;
    }
    try {
      setExportingExcel(true);
      const storedLedger = (await custodyService.getLedgerImage(selectedDate)) || activeStoredLedger;
      const activeLedgerUrl = storedLedger || currentDay.ledger_image_url || undefined;
      await invalidateCustodyPdfCache(selectedDate);
      if (activeLedgerUrl) evictImageCache(activeLedgerUrl);
      await exportCustodyDayToPdf(
        { ...currentDay, ledger_image_url: activeLedgerUrl },
        { user: currentUser, dayLogs, mode, ledgerImageUrl: activeLedgerUrl, forceRegenerate: true }
      );
    } catch (err: any) {
      Alert.alert('خطأ في تصدير الـ PDF', err?.message || 'فشل إنشاء ومعاينة تقرير الـ PDF');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleSaveLedgerImage = async (imageUri: string) => {
    try {
      let cleanUri = imageUri;
      try {
        const manip = await manipulateAsync(imageUri, [{ resize: { width: 1280 } }], {
          compress: 0.82,
          format: SaveFormat.JPEG,
        });
        if (manip.uri) cleanUri = manip.uri;
      } catch (_) {}

      const targetDate = selectedDate;
      const uploadedUrl = await custodyService.setLedgerImage(targetDate, cleanUri);
      await invalidateCustodyPdfCache(targetDate);
      evictImageCache(uploadedUrl);
      evictImageCache(cleanUri);
      evictImageCache(imageUri);
      setActiveStoredLedger(uploadedUrl);

      const fallbackDay: CustodyDayData = {
        id: `temp_${Date.now()}`,
        date: targetDate,
        opening_balance: effectiveOpeningBalance,
        added_amount: 0,
        custody_value: effectiveOpeningBalance,
        total_expenses: 0,
        closing_balance: effectiveOpeningBalance,
        expenses: [],
        ledger_image_url: uploadedUrl,
        totals: { fuel: 0, internet_advance: 0, advance: 0, license: 0, spare_parts: 0, other: 0 },
        created_at: new Date().toISOString(),
      };

      setDays((prevDays: CustodyDayData[]) =>
        prevDays.some((d) => d.date === targetDate)
          ? prevDays.map((d) => (d.date === targetDate ? { ...d, ledger_image_url: uploadedUrl } : d))
          : [fallbackDay, ...prevDays]
      );

      AsyncStorage.getItem(getDaysCacheKey(bId))
        .then((cachedStr) => {
          if (cachedStr) {
            try {
              const parsed: CustodyDayData[] = JSON.parse(cachedStr);
              const updated = parsed.some((d) => d.date === targetDate)
                ? parsed.map((d) => (d.date === targetDate ? { ...d, ledger_image_url: uploadedUrl } : d))
                : [fallbackDay, ...parsed];
              AsyncStorage.setItem(getDaysCacheKey(bId), JSON.stringify(updated)).catch(() => {});
            } catch (_) {}
          }
        })
        .catch(() => {});

      setAlertConfig({
        type: 'success',
        title: 'تم بنجاح',
        message: 'تم حفظ وإرفاق صورة الدفتر اليومي للعهدة بنجاح',
      });
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ صورة الدفتر اليومي');
    }
  };

  return {
    handlePickImage,
    handlePickEditImage,
    handleReorderExpenses,
    handleExportPdf,
    handleSaveLedgerImage,
  };
}
