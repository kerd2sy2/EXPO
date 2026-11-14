import { rgb, PDFPage, PDFFont, PDFImage } from 'pdf-lib';
import { toQR } from 'toqr';
import { CustodyLogItem } from '../custodyService';

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 36;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(str: string | number | null | undefined): string {
  return String(str ?? '').replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d, 10)] || d);
}

export function formatArabicAmountForFontkit(amount: number, decimals = 2): string {
  const parts = Number(amount || 0).toFixed(decimals).split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : '';
  const revDec = toArabicDigits(decPart.split('').reverse().join(''));
  const revInt = toArabicDigits(intPart.split('').reverse().join(''));
  return decPart ? `${revDec}.${revInt}` : revInt;
}

export function formatArabicTextForFontkit(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  const str = String(text).replace(/[()]/g, (char) => (char === '(' ? ')' : '('));
  return str.replace(/[0-9]+/g, (match) => toArabicDigits(match.split('').reverse().join('')));
}

export function formatArabicDateForFontkit(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return toArabicDigits(String(dateStr).trim()).split('').reverse().join('');
}

export const drawQrCode = (page: PDFPage, text: string, x: number, y: number, size: number) => {
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

export const CATEGORY_ORDER: Array<{
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
  mode?: 'preview' | 'share' | 'none';
  ledgerImageUrl?: string;
  forceRegenerate?: boolean;
}

export interface PdfPainters {
  drawRtlText: (
    page: PDFPage,
    rawText: string | number | null | undefined,
    rightX: number,
    y: number,
    size: number,
    font: PDFFont,
    color?: ReturnType<typeof rgb>
  ) => number;
  drawCenteredRtlText: (
    page: PDFPage,
    rawText: string | number | null | undefined,
    centerX: number,
    y: number,
    size: number,
    font: PDFFont,
    color?: ReturnType<typeof rgb>
  ) => number;
  drawCenteredAmount: (
    page: PDFPage,
    amount: number,
    centerX: number,
    y: number,
    size: number,
    font: PDFFont,
    color?: ReturnType<typeof rgb>
  ) => number;
  drawAmountWithSymbolRtl: (
    page: PDFPage,
    amount: number,
    rightX: number,
    y: number,
    size: number,
    font: PDFFont,
    color?: ReturnType<typeof rgb>
  ) => number;
}

export const createPdfPainters = (riyalImg: PDFImage | null): PdfPainters => {
  const drawRtlText: PdfPainters['drawRtlText'] = (
    page, rawText, rightX, y, size, font, color = rgb(0.06, 0.09, 0.16)
  ) => {
    const text = formatArabicTextForFontkit(rawText);
    if (!text) return 0;
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: rightX - width, y, size, font, color });
    return width;
  };

  const drawCenteredRtlText: PdfPainters['drawCenteredRtlText'] = (
    page, rawText, centerX, y, size, font, color = rgb(0.06, 0.09, 0.16)
  ) => {
    const text = formatArabicTextForFontkit(rawText);
    if (!text) return 0;
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: centerX - width / 2, y, size, font, color });
    return width;
  };

  const drawCenteredAmount: PdfPainters['drawCenteredAmount'] = (
    page, amount, centerX, y, size, font, color = rgb(0.06, 0.09, 0.16)
  ) => {
    const numStr = formatArabicAmountForFontkit(amount, 2);
    const numW = font.widthOfTextAtSize(numStr, size);
    const symbolH = size * 0.95;
    const symbolW = symbolH * (330 / 369);
    const gap = 4;
    const totalW = numW + symbolW + gap;
    const startX = centerX - totalW / 2;

    if (riyalImg) {
      page.drawImage(riyalImg, { x: startX, y: y - 1, width: symbolW, height: symbolH });
    } else {
      page.drawText('ر.س', { x: startX, y, size: size * 0.85, font, color });
    }
    page.drawText(numStr, { x: startX + symbolW + gap, y, size, font, color });
    return totalW;
  };

  const drawAmountWithSymbolRtl: PdfPainters['drawAmountWithSymbolRtl'] = (
    page, amount, rightX, y, size, font, color = rgb(0.92, 0.35, 0.05)
  ) => {
    const numStr = formatArabicAmountForFontkit(amount, 2);
    const numW = font.widthOfTextAtSize(numStr, size);
    const symbolH = size * 0.92;
    const symbolW = symbolH * (330 / 369);
    const gap = 4;
    const totalW = numW + symbolW + gap;
    const numX = rightX - numW;
    page.drawText(numStr, { x: numX, y, size, font, color });

    const symbolX = numX - gap - symbolW;
    if (riyalImg) {
      page.drawImage(riyalImg, { x: symbolX, y: y - 1, width: symbolW, height: symbolH });
    } else {
      page.drawText('ر.س', { x: symbolX, y, size: size * 0.85, font, color });
    }
    return totalW;
  };

  return { drawRtlText, drawCenteredRtlText, drawCenteredAmount, drawAmountWithSymbolRtl };
};
