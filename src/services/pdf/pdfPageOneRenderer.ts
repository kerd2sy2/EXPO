import { PDFDocument, rgb, PDFPage, PDFFont, PDFImage } from 'pdf-lib';
import { CustodyDayData, CustodyExpenseItem } from '../custodyService';
import { fetchImageBytes } from './pdfFontAndAssetCache';
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
  formatArabicDateForFontkit,
  PdfPainters,
  ExportPdfOptions,
} from './pdfArabicAndDrawHelpers';

export const startContinuationPage = (
  pdfDoc: PDFDocument,
  allPages: PDFPage[],
  fontBold: PDFFont,
  logoImg: PDFImage | null,
  painters: PdfPainters
): { page: PDFPage; curY: number } => {
  const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  allPages.push(newPage);

  newPage.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 16, width: 110, height: 3, color: rgb(0.92, 0.35, 0.05) });
  newPage.drawRectangle({ x: MARGIN + 110, y: PAGE_HEIGHT - 16, width: CONTENT_WIDTH - 110, height: 3, color: rgb(0.12, 0.16, 0.24) });

  const miniLogoSize = 24;
  const brandRightX = PAGE_WIDTH - MARGIN;
  const brandY = PAGE_HEIGHT - 22 - miniLogoSize;
  const aamsW = fontBold.widthOfTextAtSize('AAMS', 12);
  newPage.drawText('AAMS', { x: brandRightX - aamsW, y: brandY + 10, size: 12, font: fontBold, color: rgb(0.06, 0.09, 0.16) });
  const logW = fontBold.widthOfTextAtSize('LOGISTICS', 5.5);
  newPage.drawText('LOGISTICS', { x: brandRightX - logW, y: brandY + 2, size: 5.5, font: fontBold, color: rgb(0.3, 0.35, 0.45) });

  if (logoImg) {
    newPage.drawImage(logoImg, { x: brandRightX - aamsW - 8 - miniLogoSize, y: brandY, width: miniLogoSize, height: miniLogoSize });
  }

  painters.drawRtlText(newPage, 'بيان وتوثيق فواتير المصاريف المرفقة', MARGIN + 210, PAGE_HEIGHT - 38, 11.5, fontBold, rgb(0.06, 0.09, 0.16));
  newPage.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 48, width: CONTENT_WIDTH, height: 0.8, color: rgb(0.9, 0.92, 0.95) });

  return { page: newPage, curY: PAGE_HEIGHT - 64 };
};

export const renderPageOneSummaryAndLedger = async ({
  pdfDoc,
  page1,
  day,
  cleanDateStr,
  effectiveOpening,
  addedAmount,
  totalExpenses,
  closingBalance,
  expenses,
  fontRegular,
  fontBold,
  logoImg,
  painters,
  options,
}: {
  pdfDoc: PDFDocument;
  page1: PDFPage;
  day: CustodyDayData;
  cleanDateStr: string;
  effectiveOpening: number;
  addedAmount: number;
  totalExpenses: number;
  closingBalance: number;
  expenses: CustodyExpenseItem[];
  fontRegular: PDFFont;
  fontBold: PDFFont;
  logoImg: PDFImage | null;
  painters: PdfPainters;
  options?: ExportPdfOptions;
}): Promise<number> => {
  const supervisorName = options?.user?.name || options?.user?.username || 'ابراهيم محمود';

  // Top Header Stripe & Logo
  page1.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 16, width: 110, height: 3.5, color: rgb(0.92, 0.35, 0.05) });
  page1.drawRectangle({ x: MARGIN + 110, y: PAGE_HEIGHT - 16, width: CONTENT_WIDTH - 110, height: 3.5, color: rgb(0.12, 0.16, 0.24) });

  const logoSize = 30;
  const brandRightX = PAGE_WIDTH - MARGIN;
  const brandY = PAGE_HEIGHT - 24 - logoSize;
  const aamsTextW = fontBold.widthOfTextAtSize('AAMS', 15);
  page1.drawText('AAMS', { x: brandRightX - aamsTextW, y: brandY + 13, size: 15, font: fontBold, color: rgb(0.06, 0.09, 0.16) });
  const logTextW = fontBold.widthOfTextAtSize('LOGISTICS', 6.5);
  page1.drawText('LOGISTICS', { x: brandRightX - logTextW, y: brandY + 3, size: 6.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  if (logoImg) {
    page1.drawImage(logoImg, { x: brandRightX - aamsTextW - 10 - logoSize, y: brandY, width: logoSize, height: logoSize });
  }

  // Bottom Header Info Bar
  const infoBarTopY = brandY - 12;
  page1.drawRectangle({ x: MARGIN, y: infoBarTopY, width: CONTENT_WIDTH, height: 0.8, color: rgb(0.9, 0.92, 0.95) });
  const infoRowY = infoBarTopY - 18;
  const supRight = PAGE_WIDTH - MARGIN - 4;
  painters.drawRtlText(page1, supervisorName, supRight - 22, infoRowY, 11, fontBold, rgb(0.06, 0.09, 0.16));
  page1.drawCircle({ x: supRight - 8, y: infoRowY + 4, size: 8, color: rgb(1, 0.94, 0.9), borderColor: rgb(0.99, 0.84, 0.67), borderWidth: 1 });

  const dateVisual = formatArabicDateForFontkit(cleanDateStr.replace(/-/g, '/'));
  painters.drawRtlText(page1, dateVisual, MARGIN + 85, infoRowY, 11, fontBold, rgb(0.06, 0.09, 0.16));
  page1.drawCircle({ x: MARGIN + 98, y: infoRowY + 4, size: 8, color: rgb(1, 0.94, 0.9), borderColor: rgb(0.99, 0.84, 0.67), borderWidth: 1 });
  page1.drawRectangle({ x: MARGIN, y: infoBarTopY - 26, width: CONTENT_WIDTH, height: 0.8, color: rgb(0.9, 0.92, 0.95) });

  let curY = infoBarTopY - 38;

  // Section 1: Financial Summary
  page1.drawRectangle({ x: PAGE_WIDTH - MARGIN - 4, y: curY - 13, width: 4, height: 15, color: rgb(0.92, 0.35, 0.05) });
  painters.drawRtlText(page1, 'أولاً: ملخص حركة العهدة والرصيد الصافي المتبقي', PAGE_WIDTH - MARGIN - 12, curY - 11, 12, fontBold, rgb(0.06, 0.09, 0.16));
  curY -= 22;

  const STAT_CARD_H = 60;
  const GAP = 8;
  const STAT_CARD_W = (CONTENT_WIDTH - GAP * 3) / 4;
  const statBoxes = [
    { title: 'باقي أمس - افتتاحي', amount: effectiveOpening, bg: rgb(0.95, 0.96, 0.98), border: rgb(0.8, 0.84, 0.89), valColor: rgb(0.06, 0.09, 0.16) },
    { title: 'العهدة المضافة اليوم', amount: addedAmount, bg: rgb(1, 0.97, 0.93), border: rgb(0.99, 0.84, 0.67), valColor: rgb(0.92, 0.35, 0.05) },
    { title: 'إجمالي المصاريف', amount: totalExpenses, bg: rgb(1, 0.95, 0.95), border: rgb(0.99, 0.8, 0.8), valColor: rgb(0.86, 0.15, 0.15) },
    { title: 'صافي العهدة المتبقي', amount: closingBalance, bg: rgb(0.94, 0.99, 0.96), border: rgb(0.73, 0.97, 0.82), valColor: rgb(0.09, 0.64, 0.29) },
  ];

  statBoxes.forEach((item, idx) => {
    const cardX = PAGE_WIDTH - MARGIN - (idx + 1) * STAT_CARD_W - idx * GAP;
    page1.drawRectangle({ x: cardX, y: curY - STAT_CARD_H, width: STAT_CARD_W, height: STAT_CARD_H, color: item.bg, borderColor: item.border, borderWidth: 1.1 });
    painters.drawCenteredRtlText(page1, item.title, cardX + STAT_CARD_W / 2, curY - 18, 9, fontBold, rgb(0.35, 0.4, 0.48));
    painters.drawCenteredAmount(page1, item.amount, cardX + STAT_CARD_W / 2, curY - 42, 12, fontBold, item.valColor);
  });

  curY -= STAT_CARD_H + 16;

  // Section 2: Category Breakdown Table
  page1.drawRectangle({ x: PAGE_WIDTH - MARGIN - 4, y: curY - 12, width: 4, height: 14, color: rgb(0.92, 0.35, 0.05) });
  painters.drawRtlText(page1, 'ثانياً: تفصيل المصروفات حسب الأقسام والتصنيفات', PAGE_WIDTH - MARGIN - 12, curY - 10, 11.5, fontBold, rgb(0.06, 0.09, 0.16));
  curY -= 18;

  const TABLE_ROW_H = 19;
  page1.drawRectangle({ x: MARGIN, y: curY - TABLE_ROW_H, width: CONTENT_WIDTH, height: TABLE_ROW_H, color: rgb(0.09, 0.13, 0.22) });

  const catCols = [
    { title: 'القسم / البند', width: 220 },
    { title: 'عدد الفواتير', width: 140 },
    { title: 'المبلغ الإجمالي', width: 163.28 },
  ];

  let colAccX = PAGE_WIDTH - MARGIN;
  catCols.forEach((col) => {
    painters.drawCenteredRtlText(page1, col.title, colAccX - col.width / 2, curY - 13.5, 9, fontBold, rgb(1, 1, 1));
    colAccX -= col.width;
  });
  curY -= TABLE_ROW_H;

  const categoriesList = [
    { key: 'fuel', label: 'بنزين', val: day.totals?.fuel || 0 },
    { key: 'internet_advance', label: 'سلفة نت', val: day.totals?.internet_advance || 0 },
    { key: 'advance', label: 'سلفة شخصية', val: day.totals?.advance || 0 },
    { key: 'license', label: 'رخصة القيادة', val: day.totals?.license || 0 },
    { key: 'spare_parts', label: 'قطع غيار', val: day.totals?.spare_parts || 0 },
    { key: 'other', label: 'مصاريف أخرى', val: day.totals?.other || 0 },
  ];

  categoriesList.forEach((cat, rIdx) => {
    const rowBg = rIdx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 0.99);
    page1.drawRectangle({ x: MARGIN, y: curY - TABLE_ROW_H, width: CONTENT_WIDTH, height: TABLE_ROW_H, color: rowBg, borderColor: rgb(0.9, 0.92, 0.95), borderWidth: 0.8 });
    const count = expenses.filter((e) => e.category === cat.key).length;
    colAccX = PAGE_WIDTH - MARGIN;
    painters.drawRtlText(page1, cat.label, colAccX - 20, curY - 13.5, 9.5, fontBold, rgb(0.1, 0.15, 0.25));
    colAccX -= catCols[0].width;
    painters.drawCenteredRtlText(page1, count > 0 ? `${count} فواتير` : '—', colAccX - catCols[1].width / 2, curY - 13.5, 9, fontRegular, count > 0 ? rgb(0.92, 0.35, 0.05) : rgb(0.6, 0.65, 0.7));
    colAccX -= catCols[1].width;
    painters.drawCenteredAmount(page1, cat.val, colAccX - catCols[2].width / 2, curY - 13.5, 9.5, fontBold, cat.val > 0 ? rgb(0.06, 0.09, 0.16) : rgb(0.6, 0.65, 0.7));
    curY -= TABLE_ROW_H;
  });

  const TOTAL_ROW_H = 22;
  page1.drawRectangle({ x: MARGIN, y: curY - TOTAL_ROW_H, width: CONTENT_WIDTH, height: TOTAL_ROW_H, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.8, 0.85, 0.95), borderWidth: 1 });
  painters.drawRtlText(page1, 'إجمالي المصروفات الكلي:', PAGE_WIDTH - MARGIN - 20, curY - 15, 10, fontBold, rgb(0.06, 0.09, 0.16));
  painters.drawCenteredRtlText(page1, `${expenses.length} فواتير مسجلة`, PAGE_WIDTH - MARGIN - catCols[0].width - catCols[1].width / 2, curY - 15, 9.5, fontBold, rgb(0.92, 0.35, 0.05));
  painters.drawCenteredAmount(page1, totalExpenses, MARGIN + catCols[2].width / 2, curY - 15, 10.5, fontBold, rgb(0.86, 0.15, 0.15));
  curY -= TOTAL_ROW_H + 16;

  // Daily Ledger Photo
  const ledgerUrl = options?.ledgerImageUrl || day.ledger_image_url;
  if (ledgerUrl) {
    let ledgerImgData: { bytes: Uint8Array; isJpg: boolean } | null = null;
    try {
      ledgerImgData = await fetchImageBytes(ledgerUrl, !!options?.forceRegenerate);
    } catch (_) {}

    if (ledgerImgData) {
      page1.drawRectangle({ x: PAGE_WIDTH - MARGIN - 4, y: curY - 12, width: 4, height: 14, color: rgb(0.92, 0.35, 0.05) });
      painters.drawRtlText(page1, 'صورة الدفتر', PAGE_WIDTH - MARGIN - 12, curY - 10, 11.5, fontBold, rgb(0.06, 0.09, 0.16));
      curY -= 18;

      const CARD_IMG_W = 507;
      const CARD_IMG_H = 300;
      const LEDGER_CARD_H = CARD_IMG_H + 12;
      page1.drawRectangle({ x: MARGIN, y: curY - LEDGER_CARD_H, width: CONTENT_WIDTH, height: LEDGER_CARD_H, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1.1 });

      const imgBoxX = MARGIN + (CONTENT_WIDTH - CARD_IMG_W) / 2;
      const imgBoxY = curY - LEDGER_CARD_H + 6;
      page1.drawRectangle({ x: imgBoxX, y: imgBoxY, width: CARD_IMG_W, height: CARD_IMG_H, color: rgb(0.95, 0.96, 0.98), borderColor: rgb(0.86, 0.89, 0.93), borderWidth: 1 });

      try {
        let embeddedImg: PDFImage | null = null;
        try {
          embeddedImg = ledgerImgData.isJpg ? await pdfDoc.embedJpg(ledgerImgData.bytes) : await pdfDoc.embedPng(ledgerImgData.bytes);
        } catch {
          embeddedImg = ledgerImgData.isJpg ? await pdfDoc.embedPng(ledgerImgData.bytes) : await pdfDoc.embedJpg(ledgerImgData.bytes);
        }
        if (embeddedImg) {
          const imgDim = embeddedImg.scaleToFit(CARD_IMG_W - 8, CARD_IMG_H - 8);
          page1.drawImage(embeddedImg, { x: imgBoxX + (CARD_IMG_W - imgDim.width) / 2, y: imgBoxY + (CARD_IMG_H - imgDim.height) / 2, width: imgDim.width, height: imgDim.height });
        }
      } catch (embedErr) {
        console.warn('[PDF] Failed to embed ledger image:', embedErr);
      }

      curY -= LEDGER_CARD_H + 16;
    }
  }

  return curY;
};
