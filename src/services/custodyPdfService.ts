import { PDFDocument, rgb, PDFPage, PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { CustodyDayData } from './custodyService';
import {
  evictImageCache,
  fetchImageBytes,
  getFontRegularBytes,
  getFontBoldBytes,
  getLogoBytes,
  getRiyalBytes,
  invalidateCustodyPdfCache,
  getCustodyPdfCacheUri,
} from './pdf/pdfFontAndAssetCache';
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  toArabicDigits,
  formatArabicAmountForFontkit,
  formatArabicTextForFontkit,
  formatArabicDateForFontkit,
  ExportPdfOptions,
  createPdfPainters,
} from './pdf/pdfArabicAndDrawHelpers';
import { renderPageOneSummaryAndLedger } from './pdf/pdfPageOneRenderer';
import { renderInvoicesSections } from './pdf/pdfInvoicesSectionRenderer';

export {
  evictImageCache,
  invalidateCustodyPdfCache,
  getCustodyPdfCacheUri,
  toArabicDigits,
  formatArabicAmountForFontkit,
  formatArabicTextForFontkit,
  formatArabicDateForFontkit,
  ExportPdfOptions,
};

export const exportCustodyDayToPdf = async (
  day: CustodyDayData,
  options?: ExportPdfOptions
): Promise<string> => {
  const cleanDateStr = String(day.date || '').trim();
  const activeLedgerUrl = options?.ledgerImageUrl || day.ledger_image_url;
  const cachedPdfUri = getCustodyPdfCacheUri(day, activeLedgerUrl);

  if (!options?.forceRegenerate) {
    try {
      const info = await FileSystem.getInfoAsync(cachedPdfUri);
      if (info.exists && info.size > 2000) {
        if (options?.mode === 'share') {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(cachedPdfUri, {
              mimeType: 'application/pdf',
              dialogTitle: `مشاركة تقرير العهدة (${cleanDateStr})`,
              UTI: 'com.adobe.pdf',
            });
          }
        }
        return cachedPdfUri;
      }
    } catch (_) {}
  } else {
    await FileSystem.deleteAsync(cachedPdfUri, { idempotent: true }).catch(() => {});
  }

  const allImageUrls: string[] = [];
  if (activeLedgerUrl) allImageUrls.push(activeLedgerUrl);
  (day.expenses || []).forEach((e) => {
    if (e.image_url) allImageUrls.push(e.image_url);
  });
  if (allImageUrls.length > 0) {
    await Promise.all(allImageUrls.map((u) => fetchImageBytes(u, !!options?.forceRegenerate)));
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontRegular = await pdfDoc.embedFont(await getFontRegularBytes());
  const fontBold = await pdfDoc.embedFont(await getFontBoldBytes());

  let riyalImg: PDFImage | null = null;
  const riyalBytes = await getRiyalBytes();
  if (riyalBytes) {
    try { riyalImg = await pdfDoc.embedPng(riyalBytes); } catch (_) {}
  }

  let logoImg: PDFImage | null = null;
  const logoBytes = await getLogoBytes();
  if (logoBytes) {
    try { logoImg = await pdfDoc.embedPng(logoBytes); } catch (_) {}
  }

  const painters = createPdfPainters(riyalImg);
  const effectiveOpening = day.opening_balance ?? 0;
  const addedAmount = day.added_amount ?? 0;
  const totalExpenses = day.total_expenses ?? 0;
  const closingBalance =
    day.closing_balance !== undefined && day.closing_balance !== null
      ? day.closing_balance
      : effectiveOpening + addedAmount - totalExpenses;
  const expenses = day.expenses || [];

  const allPages: PDFPage[] = [];
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  allPages.push(page1);

  const curY = await renderPageOneSummaryAndLedger({
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
  });

  await renderInvoicesSections({
    pdfDoc,
    allPages,
    initialPage: page1,
    initialCurY: curY,
    expenses,
    fontRegular,
    fontBold,
    logoImg,
    painters,
    options,
  });

  allPages.forEach((p, idx) => {
    const pageLabel =
      allPages.length > 1 ? `— صفحة ${idx + 1} من ${allPages.length} —` : '— تقرير العهدة اليومية —';
    painters.drawCenteredRtlText(p, pageLabel, PAGE_WIDTH / 2, 14, 8.5, fontRegular, rgb(0.6, 0.65, 0.72));
  });

  const base64Pdf = await pdfDoc.saveAsBase64();
  await FileSystem.writeAsStringAsync(cachedPdfUri, base64Pdf, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (options?.mode === 'share' || options?.mode === 'preview') {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(cachedPdfUri, {
        mimeType: 'application/pdf',
        dialogTitle:
          options.mode === 'preview'
            ? `معاينة تقرير العهدة (${cleanDateStr})`
            : `مشاركة تقرير العهدة (${cleanDateStr})`,
        UTI: 'com.adobe.pdf',
      });
    }
  }

  return cachedPdfUri;
};

export const prewarmCustodyPdf = async (
  day: CustodyDayData,
  options?: Omit<ExportPdfOptions, 'mode'>
): Promise<string> => {
  return exportCustodyDayToPdf(day, { ...options, mode: 'none' });
};
