import ExcelJS from 'exceljs';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { CustodyDayData, CustodyExpenseItem } from './custodyService';
import { formatImageUrl } from './api';

// Helper to download an image and return its base64 string and extension
const fetchImageBase64 = async (url: string): Promise<{ base64: string; extension: 'jpeg' | 'png' } | null> => {
  try {
    const formatted = formatImageUrl(url);
    if (!formatted) return null;

    const ext = formatted.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    const tempFileUri = `${FileSystem.cacheDirectory}temp_inv_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const downloadRes = await FileSystem.downloadAsync(formatted, tempFileUri);
    if (downloadRes.status !== 200) {
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(downloadRes.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Cleanup temp file
    FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => {});

    return { base64, extension: ext };
  } catch (err) {
    console.warn('[ExcelExport] Failed to download image for embedding:', err);
    return null;
  }
};

export const exportCustodyDayToExcel = async (day: CustodyDayData): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AAMS Logistics';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`عهدة_${day.date}`, {
      views: [{ rightToLeft: true }], // Native RTL view for Arabic
    });

    // Setup Columns
    sheet.columns = [
      { key: 'colA', width: 8 },  // م
      { key: 'colB', width: 18 }, // الوقت
      { key: 'colC', width: 24 }, // التصنيف
      { key: 'colD', width: 20 }, // المبلغ
      { key: 'colE', width: 32 }, // البيان
      { key: 'colF', width: 30 }, // صورة الفاتورة (مضمنة)
    ];

    // Styling constants
    const primaryFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' }, // #059669 Orange
    };
    const darkHeaderFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // #0f172a Dark Slate
    };
    const lightHeaderFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }, // #f1f5f9
    };
    const accentFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }, // #0284c7 Sky Blue
    };
    const successFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' }, // #16a34a Green
    };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // 1. App Main Banner
    const row1 = sheet.addRow(['نظام العهد والمصروفات المعتمد - AAMS | ahda']);
    sheet.mergeCells('A1:F1');
    row1.height = 36;
    row1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    row1.alignment = { horizontal: 'center', vertical: 'middle' };
    row1.fill = darkHeaderFill;

    // 2. Info Row (Date & Branch)
    const row2 = sheet.addRow([
      'تاريخ العهدة:',
      day.date,
      'الفرع:',
      day.branch_name || 'الفرع الرئيسي',
      'تاريخ التصدير:',
      new Date().toLocaleDateString('ar-SA'),
    ]);
    row2.height = 24;
    row2.font = { bold: true, size: 11 };
    row2.alignment = { horizontal: 'center', vertical: 'middle' };
    row2.fill = lightHeaderFill;

    sheet.addRow([]); // Blank spacer

    // 3. Summary Financial Cards
    const summaryHeader = sheet.addRow(['ملخص حركة العهدة المالي لليوم']);
    sheet.mergeCells(`A${summaryHeader.number}:F${summaryHeader.number}`);
    summaryHeader.height = 28;
    summaryHeader.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    summaryHeader.fill = primaryFill;
    summaryHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    const sumTitles = sheet.addRow([
      'الافتتاحي (أمس)',
      'العهدة المضافة',
      'إجمالي العهدة المتاحة',
      'إجمالي المصروف',
      'صافي العهدة المتبقي',
      'الحالة',
    ]);
    sumTitles.height = 24;
    sumTitles.font = { bold: true, size: 11 };
    sumTitles.fill = lightHeaderFill;
    sumTitles.alignment = { horizontal: 'center', vertical: 'middle' };

    const totalAvailable = day.custody_value || (day.opening_balance + day.added_amount);
    const sumValues = sheet.addRow([
      `${day.opening_balance.toFixed(2)} ر.س`,
      `${day.added_amount.toFixed(2)} ر.س`,
      `${totalAvailable.toFixed(2)} ر.س`,
      `${day.total_expenses.toFixed(2)} ر.س`,
      `${day.closing_balance.toFixed(2)} ر.س`,
      day.closing_balance >= 0 ? 'مطابق وموثق ✓' : 'عجز في العهدة ⚠',
    ]);
    sumValues.height = 28;
    sumValues.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    sumValues.alignment = { horizontal: 'center', vertical: 'middle' };
    sumValues.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF64748B' } };
    sumValues.getCell(2).fill = accentFill;
    sumValues.getCell(3).fill = darkHeaderFill;
    sumValues.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // Red for expenses
    sumValues.getCell(5).fill = successFill;
    sumValues.getCell(6).fill = day.closing_balance >= 0 ? successFill : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    sheet.addRow([]); // Blank spacer

    // 4. Breakdown by Category
    const catHeader = sheet.addRow(['توزيع المصاريف حسب الأقسام والتصنيفات']);
    sheet.mergeCells(`A${catHeader.number}:F${catHeader.number}`);
    catHeader.height = 26;
    catHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    catHeader.fill = darkHeaderFill;
    catHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    const catTitles = sheet.addRow([
      'وقود / بنزين',
      'سلفة نت',
      'سلفة شخصية',
      'رخصة القيادة',
      'قطع غيار',
      'مصاريف أخرى',
    ]);
    catTitles.height = 22;
    catTitles.font = { bold: true, size: 10 };
    catTitles.fill = lightHeaderFill;
    catTitles.alignment = { horizontal: 'center', vertical: 'middle' };

    const catVals = sheet.addRow([
      `${(day.totals?.fuel || 0).toFixed(2)} ر.س`,
      `${(day.totals?.internet_advance || 0).toFixed(2)} ر.س`,
      `${(day.totals?.advance || 0).toFixed(2)} ر.س`,
      `${(day.totals?.license || 0).toFixed(2)} ر.س`,
      `${(day.totals?.spare_parts || 0).toFixed(2)} ر.س`,
      `${(day.totals?.other || 0).toFixed(2)} ر.س`,
    ]);
    catVals.height = 24;
    catVals.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
    catVals.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.addRow([]); // Blank spacer

    // 5. Invoices & Expenses Itemized Table with EMBEDDED IMAGES
    const invHeader = sheet.addRow(['كشف الفواتير وسندات الصرف الموثقة (مع الصور)']);
    sheet.mergeCells(`A${invHeader.number}:F${invHeader.number}`);
    invHeader.height = 28;
    invHeader.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    invHeader.fill = primaryFill;
    invHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    const tableCols = sheet.addRow([
      'م',
      'وقت السند',
      'القسم / التصنيف',
      'المبلغ المصروف',
      'البيان',
      'صورة الفاتورة المعتمدة',
    ]);
    tableCols.height = 26;
    tableCols.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    tableCols.fill = darkHeaderFill;
    tableCols.alignment = { horizontal: 'center', vertical: 'middle' };

    const categoryNames: Record<string, string> = {
      fuel: 'وقود / بنزين',
      internet_advance: 'سلفة نت',
      advance: 'سلفة شخصية',
      license: 'رخصة القيادة',
      spare_parts: 'قطع غيار',
      other: 'مصاريف أخرى',
    };

    if (day.expenses && day.expenses.length > 0) {
      for (let i = 0; i < day.expenses.length; i++) {
        const item: CustodyExpenseItem = day.expenses[i];
        const timeStr = item.created_at
          ? new Date(item.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
          : '—';

        const row = sheet.addRow([
          i + 1,
          timeStr,
          categoryNames[item.category] || item.category,
          `${item.amount.toFixed(2)} ر.س`,
          item.recipient_name || '—',
          item.image_url ? '' : 'بدون صورة',
        ]);

        // If invoice image exists, make row taller to embed the image thumbnail nicely
        if (item.image_url) {
          row.height = 90; // High enough for full clear thumbnail
          const imgData = await fetchImageBase64(item.image_url);
          if (imgData) {
            const imageId = workbook.addImage({
              base64: `data:image/${imgData.extension};base64,${imgData.base64}`,
              extension: imgData.extension,
            });

            // Column F is index 5 in zero-based positioning
            const rowIndex = row.number - 1; // 0-indexed row for exceljs
            sheet.addImage(imageId, {
              tl: { col: 5.15, row: rowIndex + 0.08 },
              ext: { width: 140, height: 110 },
            });
          } else {
            row.getCell(6).value = 'تعذر تحميل الصورة';
          }
        } else {
          row.height = 26;
        }

        row.alignment = { horizontal: 'center', vertical: 'middle' };
        row.font = { size: 11 };
        row.eachCell((cell) => {
          cell.border = borderStyle;
        });
      }
    } else {
      const emptyRow = sheet.addRow(['—', '—', 'لا توجد فواتير أو مصاريف مسجلة لهذا اليوم', '0.00 ر.س', '—', '—']);
      emptyRow.height = 28;
      emptyRow.alignment = { horizontal: 'center', vertical: 'middle' };
      emptyRow.font = { italic: true, color: { argb: 'FF64748B' } };
    }

    sheet.addRow([]); // Blank spacer

    // 6. Net Balance Formula Summary
    const finalCalcRow = sheet.addRow(['ملخص الإقفال النهائي']);
    sheet.mergeCells(`A${finalCalcRow.number}:F${finalCalcRow.number}`);
    finalCalcRow.height = 26;
    finalCalcRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    finalCalcRow.fill = darkHeaderFill;
    finalCalcRow.alignment = { horizontal: 'center', vertical: 'middle' };

    const endRow1 = sheet.addRow(['إجمالي العهدة المتاحة (الافتتاحي + المضاف):', `${totalAvailable.toFixed(2)} ر.س`]);
    sheet.mergeCells(`A${endRow1.number}:E${endRow1.number}`);
    endRow1.font = { bold: true };
    endRow1.alignment = { horizontal: 'right', vertical: 'middle' };

    const endRow2 = sheet.addRow(['إجمالي المصاريف الموثقة:', `${day.total_expenses.toFixed(2)} ر.س`]);
    sheet.mergeCells(`A${endRow2.number}:E${endRow2.number}`);
    endRow2.font = { bold: true, color: { argb: 'FFDC2626' } };
    endRow2.alignment = { horizontal: 'right', vertical: 'middle' };

    const endRow3 = sheet.addRow(['صافي الرصيد المتبقي للإقفال:', `${day.closing_balance.toFixed(2)} ر.س`]);
    sheet.mergeCells(`A${endRow3.number}:E${endRow3.number}`);
    endRow3.font = { bold: true, size: 13, color: { argb: 'FF16A34A' } };
    endRow3.alignment = { horizontal: 'right', vertical: 'middle' };

    // Generate buffer & write to mobile filesystem
    const buffer = await workbook.xlsx.writeBuffer();
    // Convert arraybuffer to base64
    const uint8 = new Uint8Array(buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    const filename = `تقرير_عهدة_AAMS_${day.date}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `تصدير عهدة ${day.date}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      alert(`تم حفظ الملف في: ${fileUri}`);
    }
  } catch (error: any) {
    console.error('Error exporting custody excel with exceljs:', error);
    throw error;
  }
};
