import { PDFDocument, rgb, PDFPage, PDFFont, PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { toQR } from 'toqr';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { CustodyDayData, CustodyExpenseItem, CustodyLogItem } from './custodyService';
import { formatImageUrl } from './api';
import { SAUDI_RIYAL_SYMBOL_PNG_BASE64 } from './saudiRiyalSymbolBase64';

// Helper to draw vector QR Code on PDF page
const drawQrCode = (page: PDFPage, text: string, x: number, y: number, size: number) => {
  try {
    const qr = toQR(text);
    const n = Math.round(Math.sqrt(qr.length));
    const cellSize = size / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr[r * n + c] === 1) {
          page.drawRectangle({
            x: x + c * cellSize,
            y: y + (n - 1 - r) * cellSize,
            width: cellSize,
            height: cellSize,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[PDF] Failed to draw QR code:', err);
  }
};

// Base64 to Uint8Array helper
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const base64ToUint8Array = (b64: string): Uint8Array => {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  let bufferLength = b64.length * 0.75;
  if (b64[b64.length - 1] === '=') {
    bufferLength--;
    if (b64[b64.length - 2] === '=') bufferLength--;
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const enc1 = chars.indexOf(b64[i]);
    const enc2 = chars.indexOf(b64[i + 1]);
    const enc3 = chars.indexOf(b64[i + 2]);
    const enc4 = chars.indexOf(b64[i + 3]);
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== 64 && enc3 !== -1) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (enc4 !== 64 && enc4 !== -1) bytes[p++] = ((enc3 & 3) << 6) | enc4;
  }
  return bytes;
};

// Helper to download an image and return its Uint8Array and format
const fetchImageBytes = async (url: string): Promise<{ bytes: Uint8Array; isJpg: boolean } | null> => {
  try {
    const formatted = formatImageUrl(url);
    if (!formatted) return null;

    const isPng = formatted.toLowerCase().endsWith('.png');
    const ext = isPng ? 'png' : 'jpeg';
    const tempFileUri = `${FileSystem.cacheDirectory}pdf_thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const downloadRes = await FileSystem.downloadAsync(formatted, tempFileUri);
    if (downloadRes.status !== 200) {
      return null;
    }

    const b64 = await FileSystem.readAsStringAsync(downloadRes.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => {});

    return { bytes: base64ToUint8Array(b64), isJpg: !isPng };
  } catch (err) {
    console.warn('[PDF] Failed to download invoice image:', err);
    return null;
  }
};

// ── Arabic Eastern Numerals & BiDi Fontkit Helpers ──
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(str: string | number | null | undefined): string {
  return String(str ?? '').replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d, 10)] || d);
}

/**
 * Formats a decimal amount so fontkit/pdf-lib renders it visually in Eastern Arabic numerals
 * correctly from left to right (e.g. ١٦٧٤.٠٠).
 */
export function formatArabicAmountForFontkit(amount: number, decimals = 2): string {
  const parts = Number(amount || 0).toFixed(decimals).split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : '';
  const revDec = toArabicDigits(decPart.split('').reverse().join(''));
  const revInt = toArabicDigits(intPart.split('').reverse().join(''));
  return decPart ? `${revDec}.${revInt}` : revInt;
}

/**
 * Formats text containing numbers and parentheses so that fontkit's BiDi engine
 * displays Eastern Arabic digits and brackets in natural, correct visual order.
 */
export function formatArabicTextForFontkit(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  // Invert parentheses so fontkit's BiDi engine renders them in the natural Arabic direction
  let str = String(text).replace(/[()]/g, (char) => (char === '(' ? ')' : '('));

  // Format numbers so fontkit lays them out in Eastern Arabic numerals
  return str.replace(/[0-9]+/g, (match) => {
    return toArabicDigits(match.split('').reverse().join(''));
  });
}

/**
 * Formats YYYY-MM-DD into Eastern Arabic format for visual rendering (e.g. ٢٠٢٦-١٠-١٥).
 */
export function formatArabicDateForFontkit(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  return toArabicDigits(clean).split('').reverse().join('');
}

const CATEGORY_ORDER: Array<{
  key: string;
  label: string;
  color: [number, number, number];
  bg: [number, number, number];
}> = [
  { key: 'fuel', label: 'بنزين', color: [0.92, 0.35, 0.05], bg: [1, 0.97, 0.93] },
  { key: 'internet_advance', label: 'سلفة نت', color: [0.01, 0.52, 0.78], bg: [0.94, 0.98, 1] },
  { key: 'advance', label: 'سلفة شخصية', color: [0.49, 0.23, 0.93], bg: [0.97, 0.95, 1] },
  { key: 'license', label: 'رخصة القيادة', color: [0.15, 0.39, 0.92], bg: [0.94, 0.96, 1] },
  { key: 'spare_parts', label: 'قطع غيار', color: [0.85, 0.47, 0.02], bg: [1, 0.98, 0.93] },
  { key: 'other', label: 'مصاريف أخرى', color: [0.02, 0.59, 0.41], bg: [0.94, 0.99, 0.96] },
];

export interface ExportPdfOptions {
  user?: any;
  dayLogs?: CustodyLogItem[];
  mode?: 'preview' | 'share';
  ledgerImageUrl?: string;
}

export const exportCustodyDayToPdf = async (
  day: CustodyDayData,
  options?: ExportPdfOptions
): Promise<string> => {
  // 1. Create Document with fontkit OpenType engine
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // 2. Load Fonts (Tahoma Regular & Bold)
  const regularAsset = Asset.fromModule(require('../../assets/fonts/Tahoma.ttf'));
  if (!regularAsset.localUri) await regularAsset.downloadAsync();
  const regularUri = regularAsset.localUri || regularAsset.uri;
  const regularB64 = await FileSystem.readAsStringAsync(regularUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fontRegular = await pdfDoc.embedFont(base64ToUint8Array(regularB64));

  const boldAsset = Asset.fromModule(require('../../assets/fonts/Tahoma-Bold.ttf'));
  if (!boldAsset.localUri) await boldAsset.downloadAsync();
  const boldUri = boldAsset.localUri || boldAsset.uri;
  const boldB64 = await FileSystem.readAsStringAsync(boldUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fontBold = await pdfDoc.embedFont(base64ToUint8Array(boldB64));

  // 3. Load Saudi Riyal Symbol (PNG asset / base64 fallback)
  let riyalImg: PDFImage | null = null;
  try {
    riyalImg = await pdfDoc.embedPng(base64ToUint8Array(SAUDI_RIYAL_SYMBOL_PNG_BASE64));
  } catch (err) {
    try {
      const riyalAsset = Asset.fromModule(require('../../assets/Saudi_Riyal_Symbol.png'));
      if (!riyalAsset.localUri) await riyalAsset.downloadAsync();
      const riyalUri = riyalAsset.localUri || riyalAsset.uri;
      const riyalB64 = await FileSystem.readAsStringAsync(riyalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      riyalImg = await pdfDoc.embedPng(base64ToUint8Array(riyalB64));
    } catch (assetErr) {
      console.warn('[PDF] Failed to load Saudi Riyal Symbol:', assetErr);
    }
  }

  // 4. Load Company Logo (PNG asset)
  let logoImg: PDFImage | null = null;
  try {
    const logoAsset = Asset.fromModule(require('../../assets/images/logo.png'));
    if (!logoAsset.localUri) await logoAsset.downloadAsync();
    const logoUri = logoAsset.localUri || logoAsset.uri;
    const logoB64 = await FileSystem.readAsStringAsync(logoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    logoImg = await pdfDoc.embedPng(base64ToUint8Array(logoB64));
  } catch (logoErr) {
    console.warn('[PDF] Failed to load logo:', logoErr);
  }

  const PAGE_WIDTH = 595.28; // A4 standard width
  const PAGE_HEIGHT = 841.89; // A4 standard height
  const MARGIN = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 523.28

  // Helper to draw right-aligned text (with Arabic digit and bracket normalization)
  const drawRtlText = (
    page: PDFPage,
    rawText: string | number | null | undefined,
    rightX: number,
    y: number,
    size: number,
    font: PDFFont,
    color = rgb(0.06, 0.09, 0.16)
  ) => {
    const text = formatArabicTextForFontkit(rawText);
    if (!text) return 0;
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: rightX - width,
      y,
      size,
      font,
      color,
    });
    return width;
  };

  // Helper to draw centered text (with Arabic digit and bracket normalization)
  const drawCenteredRtlText = (
    page: PDFPage,
    rawText: string | number | null | undefined,
    centerX: number,
    y: number,
    size: number,
    font: PDFFont,
    color = rgb(0.06, 0.09, 0.16)
  ) => {
    const text = formatArabicTextForFontkit(rawText);
    if (!text) return 0;
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX - width / 2,
      y,
      size,
      font,
      color,
    });
    return width;
  };

  // Helper to draw amounts centered in Eastern Arabic numerals with Saudi Riyal symbol
  const drawCenteredAmount = (
    page: PDFPage,
    amount: number,
    centerX: number,
    y: number,
    size: number,
    font: PDFFont,
    color = rgb(0.06, 0.09, 0.16)
  ) => {
    const numStr = formatArabicAmountForFontkit(amount, 2);
    const numW = font.widthOfTextAtSize(numStr, size);
    const symbolH = size * 0.95;
    const symbolW = symbolH * (330 / 369);
    const gap = 4;
    const totalW = numW + symbolW + gap;
    const startX = centerX - totalW / 2;

    if (riyalImg) {
      page.drawImage(riyalImg, {
        x: startX,
        y: y - 1,
        width: symbolW,
        height: symbolH,
      });
    } else {
      page.drawText('ر.س', {
        x: startX,
        y,
        size: size * 0.85,
        font,
        color,
      });
    }

    page.drawText(numStr, {
      x: startX + symbolW + gap,
      y,
      size,
      font,
      color,
    });
    return totalW;
  };

  // Helper to draw amounts right-aligned in Eastern Arabic numerals with Saudi Riyal symbol
  const drawAmountWithSymbolRtl = (
    page: PDFPage,
    amount: number,
    rightX: number,
    y: number,
    size: number,
    font: PDFFont,
    color = rgb(0.92, 0.35, 0.05)
  ) => {
    const numStr = formatArabicAmountForFontkit(amount, 2);
    const numW = font.widthOfTextAtSize(numStr, size);
    const symbolH = size * 0.92;
    const symbolW = symbolH * (330 / 369);
    const gap = 4;
    const totalW = numW + symbolW + gap;

    const numX = rightX - numW;
    page.drawText(numStr, {
      x: numX,
      y,
      size,
      font,
      color,
    });

    const symbolX = numX - gap - symbolW;
    if (riyalImg) {
      page.drawImage(riyalImg, {
        x: symbolX,
        y: y - 1,
        width: symbolW,
        height: symbolH,
      });
    } else {
      page.drawText('ر.س', {
        x: symbolX,
        y,
        size: size * 0.85,
        font,
        color,
      });
    }
    return totalW;
  };

  // Calculate Balances
  const effectiveOpening = day.opening_balance ?? 0;
  const addedAmount = day.added_amount ?? 0;
  const totalExpenses = day.total_expenses ?? 0;
  const closingBalance =
    day.closing_balance !== undefined && day.closing_balance !== null
      ? day.closing_balance
      : effectiveOpening + addedAmount - totalExpenses;

  const expenses = day.expenses || [];
  const supervisorName = options?.user?.name || options?.user?.username || 'ابراهيم محمود';
  const cleanDateStr = String(day.date || '').trim();
  const arabicDateVisual = formatArabicDateForFontkit(cleanDateStr);

  // ════════════════════════════════════════════════════════════
  // ── PAGE MANAGEMENT & FLOW ──
  // ════════════════════════════════════════════════════════════
  const allPages: PDFPage[] = [];

  // Create Page 1
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  allPages.push(page1);
  let currentPage: PDFPage = page1;

  // ── Executive Header on Pure White Background (Matching Supervisor Report Screenshot) ──
  // Top Thin Stripe: Orange on Left (110pt), Dark Slate on Right (Rest)
  page1.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 16,
    width: 110,
    height: 3.5,
    color: rgb(0.92, 0.35, 0.05), // Orange #047857
  });

  page1.drawRectangle({
    x: MARGIN + 110,
    y: PAGE_HEIGHT - 16,
    width: CONTENT_WIDTH - 110,
    height: 3.5,
    color: rgb(0.12, 0.16, 0.24), // Dark #1e293b
  });

  // Top Right: Brand Lockup (Logo + AAMS LOGISTICS) directly on white (No background box!)
  const logoSize = 30;
  const brandRightX = PAGE_WIDTH - MARGIN;
  const brandY = PAGE_HEIGHT - 24 - logoSize;

  const aamsTextW = fontBold.widthOfTextAtSize('AAMS', 15);
  page1.drawText('AAMS', {
    x: brandRightX - aamsTextW,
    y: brandY + 13,
    size: 15,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  const logTextW = fontBold.widthOfTextAtSize('LOGISTICS', 6.5);
  page1.drawText('LOGISTICS', {
    x: brandRightX - logTextW,
    y: brandY + 3,
    size: 6.5,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  if (logoImg) {
    const logoX = brandRightX - aamsTextW - 10 - logoSize;
    page1.drawImage(logoImg, {
      x: logoX,
      y: brandY,
      width: logoSize,
      height: logoSize,
    });
  }

  // ── Bottom Info Bar of the Header (Supervisor Name & Date Only) ──
  const infoBarTopY = brandY - 12;
  // Top divider line
  page1.drawRectangle({
    x: MARGIN,
    y: infoBarTopY,
    width: CONTENT_WIDTH,
    height: 0.8,
    color: rgb(0.9, 0.92, 0.95),
  });

  const infoRowY = infoBarTopY - 18;

  // 1. Right: Supervisor Name with Person Circle Icon
  const supRight = PAGE_WIDTH - MARGIN - 4;
  drawRtlText(page1, supervisorName, supRight - 22, infoRowY, 11, fontBold, rgb(0.06, 0.09, 0.16));
  page1.drawCircle({
    x: supRight - 8,
    y: infoRowY + 4,
    size: 8,
    color: rgb(1, 0.94, 0.9),
    borderColor: rgb(0.99, 0.84, 0.67),
    borderWidth: 1,
  });

  // 2. Left: Date (YYYY/MM/DD) with Calendar Circle Icon
  const dateSlashStr = cleanDateStr.replace(/-/g, '/');
  const dateVisual = formatArabicDateForFontkit(dateSlashStr);
  drawRtlText(page1, dateVisual, MARGIN + 85, infoRowY, 11, fontBold, rgb(0.06, 0.09, 0.16));
  page1.drawCircle({
    x: MARGIN + 98,
    y: infoRowY + 4,
    size: 8,
    color: rgb(1, 0.94, 0.9),
    borderColor: rgb(0.99, 0.84, 0.67),
    borderWidth: 1,
  });

  // Bottom divider line
  page1.drawRectangle({
    x: MARGIN,
    y: infoBarTopY - 26,
    width: CONTENT_WIDTH,
    height: 0.8,
    color: rgb(0.9, 0.92, 0.95),
  });

  let curY = infoBarTopY - 38;

  // ── Section 1: Financial Summary ──
  page1.drawRectangle({
    x: PAGE_WIDTH - MARGIN - 4,
    y: curY - 13,
    width: 4,
    height: 15,
    color: rgb(0.92, 0.35, 0.05),
  });

  drawRtlText(
    page1,
    'أولاً: ملخص حركة العهدة والرصيد الصافي المتبقي',
    PAGE_WIDTH - MARGIN - 12,
    curY - 11,
    12,
    fontBold,
    rgb(0.06, 0.09, 0.16)
  );

  curY -= 22;

  // 4 Stat Cards in a Row
  const STAT_CARD_H = 60;
  const GAP = 8;
  const STAT_CARD_W = (CONTENT_WIDTH - GAP * 3) / 4;

  const statBoxes = [
    {
      title: 'باقي أمس - افتتاحي',
      amount: effectiveOpening,
      bg: rgb(0.95, 0.96, 0.98),
      border: rgb(0.8, 0.84, 0.89),
      valColor: rgb(0.06, 0.09, 0.16),
    },
    {
      title: 'العهدة المضافة اليوم',
      amount: addedAmount,
      bg: rgb(1, 0.97, 0.93),
      border: rgb(0.99, 0.84, 0.67),
      valColor: rgb(0.92, 0.35, 0.05),
    },
    {
      title: 'إجمالي المصاريف',
      amount: totalExpenses,
      bg: rgb(1, 0.95, 0.95),
      border: rgb(0.99, 0.8, 0.8),
      valColor: rgb(0.86, 0.15, 0.15),
    },
    {
      title: 'صافي العهدة المتبقي',
      amount: closingBalance,
      bg: rgb(0.94, 0.99, 0.96),
      border: rgb(0.73, 0.97, 0.82),
      valColor: rgb(0.09, 0.64, 0.29),
    },
  ];

  statBoxes.forEach((item, idx) => {
    const cardX = PAGE_WIDTH - MARGIN - (idx + 1) * STAT_CARD_W - idx * GAP;
    page1.drawRectangle({
      x: cardX,
      y: curY - STAT_CARD_H,
      width: STAT_CARD_W,
      height: STAT_CARD_H,
      color: item.bg,
      borderColor: item.border,
      borderWidth: 1.1,
    });

    drawCenteredRtlText(
      page1,
      item.title,
      cardX + STAT_CARD_W / 2,
      curY - 18,
      9,
      fontBold,
      rgb(0.35, 0.4, 0.48)
    );

    drawCenteredAmount(
      page1,
      item.amount,
      cardX + STAT_CARD_W / 2,
      curY - 42,
      12,
      fontBold,
      item.valColor
    );
  });

  curY -= STAT_CARD_H + 16;

  // ── Section 2: Category Breakdown Table ──
  page1.drawRectangle({
    x: PAGE_WIDTH - MARGIN - 4,
    y: curY - 12,
    width: 4,
    height: 14,
    color: rgb(0.92, 0.35, 0.05),
  });

  drawRtlText(
    page1,
    'ثانياً: تفصيل المصروفات حسب الأقسام والتصنيفات',
    PAGE_WIDTH - MARGIN - 12,
    curY - 10,
    11.5,
    fontBold,
    rgb(0.06, 0.09, 0.16)
  );

  curY -= 18;

  // Category Table Header
  const TABLE_ROW_H = 19;
  page1.drawRectangle({
    x: MARGIN,
    y: curY - TABLE_ROW_H,
    width: CONTENT_WIDTH,
    height: TABLE_ROW_H,
    color: rgb(0.09, 0.13, 0.22),
  });

  const catCols = [
    { title: 'القسم / البند', width: 220 },
    { title: 'عدد الفواتير', width: 140 },
    { title: 'المبلغ الإجمالي', width: 163.28 },
  ];

  let colAccX = PAGE_WIDTH - MARGIN;
  catCols.forEach((col) => {
    drawCenteredRtlText(
      page1,
      col.title,
      colAccX - col.width / 2,
      curY - 13.5,
      9,
      fontBold,
      rgb(1, 1, 1)
    );
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
    page1.drawRectangle({
      x: MARGIN,
      y: curY - TABLE_ROW_H,
      width: CONTENT_WIDTH,
      height: TABLE_ROW_H,
      color: rowBg,
      borderColor: rgb(0.9, 0.92, 0.95),
      borderWidth: 0.8,
    });

    const count = expenses.filter((e) => e.category === cat.key).length;

    colAccX = PAGE_WIDTH - MARGIN;

    // Col 1: Label
    drawRtlText(
      page1,
      cat.label,
      colAccX - 20,
      curY - 13.5,
      9.5,
      fontBold,
      rgb(0.1, 0.15, 0.25)
    );
    colAccX -= catCols[0].width;

    // Col 2: Count in Eastern Arabic numerals
    drawCenteredRtlText(
      page1,
      count > 0 ? `${count} فواتير` : '—',
      colAccX - catCols[1].width / 2,
      curY - 13.5,
      9,
      fontRegular,
      count > 0 ? rgb(0.92, 0.35, 0.05) : rgb(0.6, 0.65, 0.7)
    );
    colAccX -= catCols[1].width;

    // Col 3: Amount in Eastern Arabic numerals
    drawCenteredAmount(
      page1,
      cat.val,
      colAccX - catCols[2].width / 2,
      curY - 13.5,
      9.5,
      fontBold,
      cat.val > 0 ? rgb(0.06, 0.09, 0.16) : rgb(0.6, 0.65, 0.7)
    );

    curY -= TABLE_ROW_H;
  });

  // Category Total Row
  const TOTAL_ROW_H = 22;
  page1.drawRectangle({
    x: MARGIN,
    y: curY - TOTAL_ROW_H,
    width: CONTENT_WIDTH,
    height: TOTAL_ROW_H,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });

  drawRtlText(
    page1,
    'إجمالي المصروفات الكلي:',
    PAGE_WIDTH - MARGIN - 20,
    curY - 15,
    10,
    fontBold,
    rgb(0.06, 0.09, 0.16)
  );

  // Total invoice count formatted accurately
  drawCenteredRtlText(
    page1,
    `${expenses.length} فواتير مسجلة`,
    PAGE_WIDTH - MARGIN - catCols[0].width - catCols[1].width / 2,
    curY - 15,
    9.5,
    fontBold,
    rgb(0.92, 0.35, 0.05)
  );

  drawCenteredAmount(
    page1,
    totalExpenses,
    MARGIN + catCols[2].width / 2,
    curY - 15,
    10.5,
    fontBold,
    rgb(0.86, 0.15, 0.15)
  );

  curY -= TOTAL_ROW_H + 16;

  // ── Helper to Start a New Page ──
  const startNewPage = () => {
    const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    allPages.push(newPage);
    currentPage = newPage;

    // Top Thin Stripe: Orange on Left, Dark Slate on Right (Consistent with Page 1)
    newPage.drawRectangle({
      x: MARGIN,
      y: PAGE_HEIGHT - 16,
      width: 110,
      height: 3,
      color: rgb(0.92, 0.35, 0.05),
    });

    newPage.drawRectangle({
      x: MARGIN + 110,
      y: PAGE_HEIGHT - 16,
      width: CONTENT_WIDTH - 110,
      height: 3,
      color: rgb(0.12, 0.16, 0.24),
    });

    // Top Right: Brand Lockup (Logo + AAMS LOGISTICS) directly on white (No background box!)
    const miniLogoSize = 24;
    const brandRightX = PAGE_WIDTH - MARGIN;
    const brandY = PAGE_HEIGHT - 22 - miniLogoSize;

    const aamsW = fontBold.widthOfTextAtSize('AAMS', 12);
    newPage.drawText('AAMS', {
      x: brandRightX - aamsW,
      y: brandY + 10,
      size: 12,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    const logW = fontBold.widthOfTextAtSize('LOGISTICS', 5.5);
    newPage.drawText('LOGISTICS', {
      x: brandRightX - logW,
      y: brandY + 2,
      size: 5.5,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.45),
    });

    if (logoImg) {
      const logoX = brandRightX - aamsW - 8 - miniLogoSize;
      newPage.drawImage(logoImg, {
        x: logoX,
        y: brandY,
        width: miniLogoSize,
        height: miniLogoSize,
      });
    }

    // Top Left: Clean Section Subtitle
    drawRtlText(
      newPage,
      'بيان وتوثيق فواتير المصاريف المرفقة',
      MARGIN + 210,
      PAGE_HEIGHT - 38,
      11.5,
      fontBold,
      rgb(0.06, 0.09, 0.16)
    );

    // Subtle divider line
    newPage.drawRectangle({
      x: MARGIN,
      y: PAGE_HEIGHT - 48,
      width: CONTENT_WIDTH,
      height: 0.8,
      color: rgb(0.9, 0.92, 0.95),
    });

    curY = PAGE_HEIGHT - 64;
    return newPage;
  };

  // ════════════════════════════════════════════════════════════
  // ── DAILY LEDGER PHOTO (صورة الدفتر اليومي - كبيرة وتأخذ الصفحة الأولى) ──
  // ════════════════════════════════════════════════════════════
  const ledgerUrl = day.ledger_image_url || options?.ledgerImageUrl;
  if (ledgerUrl) {
    let ledgerImgData: { bytes: Uint8Array; isJpg: boolean } | null = null;
    try {
      ledgerImgData = await fetchImageBytes(ledgerUrl);
    } catch (_) {}

    if (ledgerImgData) {
      // Title: "صورة الدفتر" only
      currentPage.drawRectangle({
        x: PAGE_WIDTH - MARGIN - 4,
        y: curY - 12,
        width: 4,
        height: 14,
        color: rgb(0.92, 0.35, 0.05),
      });

      drawRtlText(
        currentPage,
        'صورة الدفتر',
        PAGE_WIDTH - MARGIN - 12,
        curY - 10,
        11.5,
        fontBold,
        rgb(0.06, 0.09, 0.16)
      );

      curY -= 18;

      // Outer White Card
      const CARD_IMG_W = 507;
      const CARD_IMG_H = 300;
      const LEDGER_CARD_H = CARD_IMG_H + 12;

      currentPage.drawRectangle({
        x: MARGIN,
        y: curY - LEDGER_CARD_H,
        width: CONTENT_WIDTH,
        height: LEDGER_CARD_H,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1.1,
      });

      // Inner Image Box
      const imgBoxX = MARGIN + (CONTENT_WIDTH - CARD_IMG_W) / 2;
      const imgBoxY = curY - LEDGER_CARD_H + 6;

      currentPage.drawRectangle({
        x: imgBoxX,
        y: imgBoxY,
        width: CARD_IMG_W,
        height: CARD_IMG_H,
        color: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.86, 0.89, 0.93),
        borderWidth: 1,
      });

      try {
        const embeddedImg = ledgerImgData.isJpg
          ? await pdfDoc.embedJpg(ledgerImgData.bytes)
          : await pdfDoc.embedPng(ledgerImgData.bytes);

        const imgDim = embeddedImg.scaleToFit(CARD_IMG_W - 8, CARD_IMG_H - 8);
        currentPage.drawImage(embeddedImg, {
          x: imgBoxX + (CARD_IMG_W - imgDim.width) / 2,
          y: imgBoxY + (CARD_IMG_H - imgDim.height) / 2,
          width: imgDim.width,
          height: imgDim.height,
        });
      } catch (embedErr) {
        console.warn('[PDF] Failed to embed ledger image:', embedErr);
      }

      curY -= LEDGER_CARD_H + 16;
    }
  }

  // ════════════════════════════════════════════════════════════
  // ── SECTION 3: INVOICES (Always start on Page 2 for clean layout) ──
  // ════════════════════════════════════════════════════════════
  if (expenses.length > 0) {
    startNewPage();
  }

  if (expenses.length === 0) {
    drawCenteredRtlText(
      currentPage,
      'لا توجد فواتير أو مصاريف مسجلة لهذا اليوم',
      PAGE_WIDTH / 2,
      curY - 30,
      12,
      fontBold,
      rgb(0.5, 0.55, 0.65)
    );
  } else {
    // 1. Group expenses by category
    const groupedCategories: Array<{
      key: string;
      label: string;
      color: [number, number, number];
      bg: [number, number, number];
      expenses: CustodyExpenseItem[];
      totalAmount: number;
    }> = [];

    const knownKeys = new Set(CATEGORY_ORDER.map((c) => c.key));

    CATEGORY_ORDER.forEach((cat) => {
      const catExps = expenses.filter((e) => e.category === cat.key);
      if (catExps.length > 0) {
        const catSum = catExps.reduce((s, e) => s + (e.amount || 0), 0);
        groupedCategories.push({
          key: cat.key,
          label: cat.label,
          color: cat.color,
          bg: cat.bg,
          expenses: catExps,
          totalAmount: catSum,
        });
      }
    });

    const remainingExps = expenses.filter((e) => !knownKeys.has(e.category));
    if (remainingExps.length > 0) {
      const otherGroup = groupedCategories.find((g) => g.key === 'other');
      if (otherGroup) {
        otherGroup.expenses.push(...remainingExps);
        otherGroup.totalAmount += remainingExps.reduce((s, e) => s + (e.amount || 0), 0);
      } else {
        const catSum = remainingExps.reduce((s, e) => s + (e.amount || 0), 0);
        groupedCategories.push({
          key: 'other',
          label: 'مصاريف أخرى',
          color: [0.02, 0.59, 0.41],
          bg: [0.94, 0.99, 0.96],
          expenses: remainingExps,
          totalAmount: catSum,
        });
      }
    }

    let globalInvoiceCounter = 1;

    // Process each category section
    for (const group of groupedCategories) {
      // ── Clean Category Section Header Banner (No verbose counts or totals) ──
      const CAT_BANNER_H = 22;
      if (curY - (CAT_BANNER_H + 50) < MARGIN + 20) {
        startNewPage();
      }

      const activePageForBanner = currentPage;

      // Banner background
      activePageForBanner.drawRectangle({
        x: MARGIN,
        y: curY - CAT_BANNER_H,
        width: CONTENT_WIDTH,
        height: CAT_BANNER_H,
        color: rgb(group.bg[0], group.bg[1], group.bg[2]),
        borderColor: rgb(group.color[0], group.color[1], group.color[2]),
        borderWidth: 0.8,
      });

      // Right: Accent vertical stripe
      activePageForBanner.drawRectangle({
        x: PAGE_WIDTH - MARGIN - 4,
        y: curY - CAT_BANNER_H,
        width: 4,
        height: CAT_BANNER_H,
        color: rgb(group.color[0], group.color[1], group.color[2]),
      });

      // Right: Category Name Only
      drawRtlText(
        activePageForBanner,
        group.label,
        PAGE_WIDTH - MARGIN - 12,
        curY - 15,
        10.5,
        fontBold,
        rgb(group.color[0] * 0.7, group.color[1] * 0.7, group.color[2] * 0.7)
      );

      curY -= CAT_BANNER_H + 8;

      // ── Invoices of this Category ──
      for (const exp of group.expenses) {
        const invoiceIdx = globalInvoiceCounter++;

        let imgData: { bytes: Uint8Array; isJpg: boolean } | null = null;
        if (exp.image_url) {
          imgData = await fetchImageBytes(exp.image_url);
        }
        const hasImage = !!imgData;

        // Card Sizing (Header height = 58pt to place Amount directly under Description)
        const COMPACT_CARD_H = 92;
        const IMG_CARD_H = 266;
        const CARD_IMG_W = 490;
        const CARD_IMG_H = 196;
        const CARD_HEADER_H = 58;

        const TOTAL_CARD_H = hasImage ? IMG_CARD_H : COMPACT_CARD_H;

        if (curY - TOTAL_CARD_H < MARGIN + 20) {
          startNewPage();
        }

        const activePage = currentPage;

        if (!hasImage) {
          // ════════════════════════════════════════════════════════════
          // ── INVOICE CARD WITHOUT ATTACHMENT ──
          // ════════════════════════════════════════════════════════════
          activePage.drawRectangle({
            x: MARGIN,
            y: curY - COMPACT_CARD_H,
            width: CONTENT_WIDTH,
            height: COMPACT_CARD_H,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.88, 0.90, 0.94),
            borderWidth: 1,
          });

          // Right: Colored Accent Stripe
          activePage.drawRectangle({
            x: PAGE_WIDTH - MARGIN - 4,
            y: curY - COMPACT_CARD_H + 8,
            width: 4,
            height: COMPACT_CARD_H - 16,
            color: rgb(group.color[0], group.color[1], group.color[2]),
          });

          // Line 1: Invoice # & Category
          drawRtlText(
            activePage,
            `فاتورة رقم ${invoiceIdx}  •  ${group.label}`,
            PAGE_WIDTH - MARGIN - 14,
            curY - 16,
            11,
            fontBold,
            rgb(0.06, 0.09, 0.16)
          );

          // Line 2: Recipient / Description
          const recipientTxt = `البيان: ${exp.recipient_name || '—'}`;
          drawRtlText(
            activePage,
            recipientTxt,
            PAGE_WIDTH - MARGIN - 14,
            curY - 32,
            9.5,
            fontRegular,
            rgb(0.3, 0.35, 0.45)
          );

          // Line 3: Amount directly under Description
          const amtLabelW = drawRtlText(
            activePage,
            'المبلغ:',
            PAGE_WIDTH - MARGIN - 14,
            curY - 48,
            9.5,
            fontBold,
            rgb(0.4, 0.45, 0.55)
          );

          drawAmountWithSymbolRtl(
            activePage,
            exp.amount,
            PAGE_WIDTH - MARGIN - 14 - amtLabelW - 6,
            curY - 48,
            11,
            fontBold,
            rgb(0.92, 0.35, 0.05)
          );

          // Line 4: Dedicated Box with "لا يوجد مرفق لهذا الإيصال"
          const NO_ATTACH_BOX_H = 22;
          const noAttachBoxY = curY - COMPACT_CARD_H + 8;
          activePage.drawRectangle({
            x: MARGIN + 12,
            y: noAttachBoxY,
            width: CONTENT_WIDTH - 24,
            height: NO_ATTACH_BOX_H,
            color: rgb(0.96, 0.97, 0.99),
            borderColor: rgb(0.85, 0.88, 0.93),
            borderWidth: 1,
          });

          drawCenteredRtlText(
            activePage,
            'لا يوجد مرفق لهذا الإيصال',
            PAGE_WIDTH / 2,
            noAttachBoxY + 6.5,
            9,
            fontBold,
            rgb(0.48, 0.53, 0.62)
          );

          curY -= COMPACT_CARD_H + 8;
        } else {
          // ════════════════════════════════════════════════════════════
          // ── HIGH-RES IMAGE CARD FOR INVOICE WITH ATTACHMENT ──
          // ════════════════════════════════════════════════════════════
          activePage.drawRectangle({
            x: MARGIN,
            y: curY - TOTAL_CARD_H,
            width: CONTENT_WIDTH,
            height: TOTAL_CARD_H,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.85, 0.88, 0.92),
            borderWidth: 1.1,
          });

          // Header Area Background
          activePage.drawRectangle({
            x: MARGIN,
            y: curY - CARD_HEADER_H,
            width: CONTENT_WIDTH,
            height: CARD_HEADER_H,
            color: rgb(0.97, 0.98, 1),
          });

          // Right: Colored Accent Stripe
          activePage.drawRectangle({
            x: PAGE_WIDTH - MARGIN - 4,
            y: curY - 50,
            width: 4,
            height: 42,
            color: rgb(group.color[0], group.color[1], group.color[2]),
          });

          // Line 1: Invoice # & Category
          drawRtlText(
            activePage,
            `فاتورة رقم ${invoiceIdx}  •  ${group.label}`,
            PAGE_WIDTH - MARGIN - 14,
            curY - 16,
            11,
            fontBold,
            rgb(0.06, 0.09, 0.16)
          );

          // Line 2: Recipient / Description
          const recipientTxt = `البيان: ${exp.recipient_name || '—'}`;
          drawRtlText(
            activePage,
            recipientTxt,
            PAGE_WIDTH - MARGIN - 14,
            curY - 32,
            9.5,
            fontRegular,
            rgb(0.3, 0.35, 0.45)
          );

          // Line 3: Amount directly under Description
          const amtLabelW = drawRtlText(
            activePage,
            'المبلغ:',
            PAGE_WIDTH - MARGIN - 14,
            curY - 48,
            9.5,
            fontBold,
            rgb(0.4, 0.45, 0.55)
          );

          drawAmountWithSymbolRtl(
            activePage,
            exp.amount,
            PAGE_WIDTH - MARGIN - 14 - amtLabelW - 6,
            curY - 48,
            11,
            fontBold,
            rgb(0.92, 0.35, 0.05)
          );

          // Image Box
          let embeddedImg = null;
          try {
            if (imgData.isJpg) {
              embeddedImg = await pdfDoc.embedJpg(imgData.bytes);
            } else {
              embeddedImg = await pdfDoc.embedPng(imgData.bytes);
            }
          } catch {
            try {
              embeddedImg = imgData.isJpg
                ? await pdfDoc.embedPng(imgData.bytes)
                : await pdfDoc.embedJpg(imgData.bytes);
            } catch (embedErr) {
              console.warn('[PDF] Embed image fallback error:', embedErr);
            }
          }

          const imgBoxX = MARGIN + (CONTENT_WIDTH - CARD_IMG_W) / 2;
          const imgBoxY = curY - CARD_HEADER_H - CARD_IMG_H - 6;

          activePage.drawRectangle({
            x: imgBoxX,
            y: imgBoxY,
            width: CARD_IMG_W,
            height: CARD_IMG_H,
            color: rgb(0.95, 0.96, 0.98),
            borderColor: rgb(0.86, 0.89, 0.93),
            borderWidth: 1,
          });

          if (embeddedImg) {
            const imgAspect = embeddedImg.width / embeddedImg.height;
            const boxAspect = CARD_IMG_W / CARD_IMG_H;

            let drawW = CARD_IMG_W;
            let drawH = CARD_IMG_H;
            let drawX = imgBoxX;
            let drawY = imgBoxY;

            if (imgAspect > boxAspect) {
              drawW = CARD_IMG_W;
              drawH = CARD_IMG_W / imgAspect;
              drawY = imgBoxY + (CARD_IMG_H - drawH) / 2;
            } else {
              drawH = CARD_IMG_H;
              drawW = CARD_IMG_H * imgAspect;
              drawX = imgBoxX + (CARD_IMG_W - drawW) / 2;
            }

            activePage.drawImage(embeddedImg, {
              x: drawX,
              y: drawY,
              width: drawW,
              height: drawH,
            });
          }

          curY -= TOTAL_CARD_H + 10;
        }
      }

      curY -= 6;
    }
  }

  // Draw Page Number Footers Across All Pages in Eastern Arabic Numerals
  allPages.forEach((p, idx) => {
    const pageLabel = allPages.length > 1
      ? `— صفحة ${idx + 1} من ${allPages.length} —`
      : '— تقرير العهدة اليومية —';
    drawCenteredRtlText(
      p,
      pageLabel,
      PAGE_WIDTH / 2,
      14,
      8.5,
      fontRegular,
      rgb(0.6, 0.65, 0.72)
    );
  });

  // 3. Save PDF to device file system
  const pdfBytes = await pdfDoc.save();
  const fileName = `تقرير_عهدة_${cleanDateStr.replace(/[^0-9-]/g, '_')}.pdf`;
  const pdfUri = `${FileSystem.documentDirectory}${fileName}`;

  // Convert Uint8Array to base64 for writing
  let binary = '';
  const len = pdfBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  const base64Pdf = btoa(binary);

  await FileSystem.writeAsStringAsync(pdfUri, base64Pdf, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 4. Share or Preview file via native share dialog
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    const isPreview = options?.mode === 'preview';
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: isPreview
        ? `معاينة تقرير العهدة (${cleanDateStr})`
        : `مشاركة تقرير العهدة (${cleanDateStr})`,
      UTI: 'com.adobe.pdf',
    });
  }

  return pdfUri;
};
