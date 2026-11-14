import { PDFDocument, rgb, PDFPage, PDFFont, PDFImage } from 'pdf-lib';
import { CustodyExpenseItem } from '../custodyService';
import { fetchImageBytes } from './pdfFontAndAssetCache';
import {
  PAGE_WIDTH,
  MARGIN,
  CONTENT_WIDTH,
  CATEGORY_ORDER,
  formatArabicTextForFontkit,
  PdfPainters,
  ExportPdfOptions,
} from './pdfArabicAndDrawHelpers';
import { startContinuationPage } from './pdfPageOneRenderer';

interface CategoryGroup {
  key: string;
  label: string;
  color: [number, number, number];
  bg: [number, number, number];
  expenses: CustodyExpenseItem[];
  totalAmount: number;
}

const groupExpensesByCategory = (expenses: CustodyExpenseItem[]): CategoryGroup[] => {
  const grouped: CategoryGroup[] = [];
  const knownKeys = new Set(CATEGORY_ORDER.map((c) => c.key));

  CATEGORY_ORDER.forEach((cat) => {
    const catExps = expenses.filter((e) => e.category === cat.key);
    if (catExps.length > 0) {
      grouped.push({
        key: cat.key,
        label: cat.label,
        color: cat.color,
        bg: cat.bg,
        expenses: catExps,
        totalAmount: catExps.reduce((s, e) => s + (e.amount || 0), 0),
      });
    }
  });

  const remaining = expenses.filter((e) => !knownKeys.has(e.category));
  if (remaining.length > 0) {
    const otherGroup = grouped.find((g) => g.key === 'other');
    if (otherGroup) {
      otherGroup.expenses.push(...remaining);
      otherGroup.totalAmount += remaining.reduce((s, e) => s + (e.amount || 0), 0);
    } else {
      grouped.push({
        key: 'other',
        label: 'مصاريف أخرى',
        color: [0.02, 0.59, 0.41],
        bg: [0.94, 0.99, 0.96],
        expenses: remaining,
        totalAmount: remaining.reduce((s, e) => s + (e.amount || 0), 0),
      });
    }
  }
  return grouped;
};

export const renderInvoicesSections = async ({
  pdfDoc,
  allPages,
  initialPage,
  initialCurY,
  expenses,
  fontRegular,
  fontBold,
  logoImg,
  painters,
  options,
}: {
  pdfDoc: PDFDocument;
  allPages: PDFPage[];
  initialPage: PDFPage;
  initialCurY: number;
  expenses: CustodyExpenseItem[];
  fontRegular: PDFFont;
  fontBold: PDFFont;
  logoImg: PDFImage | null;
  painters: PdfPainters;
  options?: ExportPdfOptions;
}): Promise<void> => {
  let currentPage = initialPage;
  let curY = initialCurY;

  const ensureSpaceOrNewPage = (needed: number) => {
    if (curY - needed < MARGIN + 20) {
      const next = startContinuationPage(pdfDoc, allPages, fontBold, logoImg, painters);
      currentPage = next.page;
      curY = next.curY;
    }
  };

  if (expenses.length > 0) {
    const next = startContinuationPage(pdfDoc, allPages, fontBold, logoImg, painters);
    currentPage = next.page;
    curY = next.curY;
  }

  if (expenses.length === 0) {
    painters.drawCenteredRtlText(
      currentPage,
      'لا توجد فواتير أو مصاريف مسجلة لهذا اليوم',
      PAGE_WIDTH / 2,
      curY - 30,
      12,
      fontBold,
      rgb(0.5, 0.55, 0.65)
    );
    return;
  }

  const groupedCategories = groupExpensesByCategory(expenses);
  let globalInvoiceCounter = 1;

  for (const group of groupedCategories) {
    const CAT_BANNER_H = 22;
    ensureSpaceOrNewPage(CAT_BANNER_H + 50);

    currentPage.drawRectangle({
      x: MARGIN,
      y: curY - CAT_BANNER_H,
      width: CONTENT_WIDTH,
      height: CAT_BANNER_H,
      color: rgb(group.bg[0], group.bg[1], group.bg[2]),
      borderColor: rgb(group.color[0], group.color[1], group.color[2]),
      borderWidth: 0.8,
    });
    currentPage.drawRectangle({
      x: PAGE_WIDTH - MARGIN - 4,
      y: curY - CAT_BANNER_H,
      width: 4,
      height: CAT_BANNER_H,
      color: rgb(group.color[0], group.color[1], group.color[2]),
    });
    painters.drawRtlText(
      currentPage,
      group.label,
      PAGE_WIDTH - MARGIN - 12,
      curY - 15,
      10.5,
      fontBold,
      rgb(group.color[0] * 0.7, group.color[1] * 0.7, group.color[2] * 0.7)
    );
    curY -= CAT_BANNER_H + 8;

    for (const exp of group.expenses) {
      const invoiceIdx = globalInvoiceCounter++;
      const imgData = exp.image_url
        ? await fetchImageBytes(exp.image_url, !!options?.forceRegenerate)
        : null;
      const hasImage = !!imgData;

      const COMPACT_CARD_H = 92;
      const IMG_CARD_H = 266;
      const CARD_IMG_W = 490;
      const CARD_IMG_H = 196;
      const CARD_HEADER_H = 58;
      const TOTAL_CARD_H = hasImage ? IMG_CARD_H : COMPACT_CARD_H;

      ensureSpaceOrNewPage(TOTAL_CARD_H);
      const activePage = currentPage;

      activePage.drawRectangle({
        x: MARGIN,
        y: curY - TOTAL_CARD_H,
        width: CONTENT_WIDTH,
        height: TOTAL_CARD_H,
        color: rgb(1, 1, 1),
        borderColor: hasImage ? rgb(0.85, 0.88, 0.92) : rgb(0.88, 0.9, 0.94),
        borderWidth: hasImage ? 1.1 : 1,
      });

      if (hasImage) {
        activePage.drawRectangle({
          x: MARGIN,
          y: curY - CARD_HEADER_H,
          width: CONTENT_WIDTH,
          height: CARD_HEADER_H,
          color: rgb(0.97, 0.98, 1),
        });
        activePage.drawRectangle({
          x: PAGE_WIDTH - MARGIN - 4,
          y: curY - 50,
          width: 4,
          height: 42,
          color: rgb(group.color[0], group.color[1], group.color[2]),
        });
      } else {
        activePage.drawRectangle({
          x: PAGE_WIDTH - MARGIN - 4,
          y: curY - COMPACT_CARD_H + 8,
          width: 4,
          height: COMPACT_CARD_H - 16,
          color: rgb(group.color[0], group.color[1], group.color[2]),
        });
      }

      painters.drawRtlText(activePage, `فاتورة رقم ${invoiceIdx}`, PAGE_WIDTH - MARGIN - 14, curY - 16, 11, fontBold, rgb(0.06, 0.09, 0.16));

      if (exp.export_number && exp.export_number.trim()) {
        const noteLabel = `رقم الوارد: ${exp.export_number.trim()}`;
        const formattedNote = formatArabicTextForFontkit(noteLabel);
        const textW = fontBold.widthOfTextAtSize(formattedNote, 9.5);
        const boxW = textW + 20;
        const boxH = hasImage ? 24 : 22;
        const boxX = MARGIN + 12;
        const boxY = curY - (hasImage ? 36 : 26);

        activePage.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxW,
          height: boxH,
          color: rgb(0.93, 0.98, 0.95),
          borderColor: rgb(0.05, 0.6, 0.42),
          borderWidth: hasImage ? 1.2 : 1.1,
        });
        activePage.drawRectangle({ x: boxX + boxW - 3.5, y: boxY, width: 3.5, height: boxH, color: rgb(0.04, 0.47, 0.34) });
        painters.drawRtlText(activePage, noteLabel, boxX + boxW - 8, boxY + (hasImage ? 7 : 6.5), 9.5, fontBold, rgb(0.04, 0.38, 0.27));
      }

      painters.drawRtlText(activePage, `البيان: ${exp.recipient_name || '—'}`, PAGE_WIDTH - MARGIN - 14, curY - 32, 9.5, fontRegular, rgb(0.3, 0.35, 0.45));
      const amtLabelW = painters.drawRtlText(activePage, 'المبلغ:', PAGE_WIDTH - MARGIN - 14, curY - 48, 9.5, fontBold, rgb(0.4, 0.45, 0.55));
      painters.drawAmountWithSymbolRtl(activePage, exp.amount, PAGE_WIDTH - MARGIN - 14 - amtLabelW - 6, curY - 48, 11, fontBold, rgb(0.92, 0.35, 0.05));

      if (!hasImage) {
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
        painters.drawCenteredRtlText(activePage, 'لا يوجد مرفق لهذا الإيصال', PAGE_WIDTH / 2, noAttachBoxY + 6.5, 9, fontBold, rgb(0.48, 0.53, 0.62));
        curY -= COMPACT_CARD_H + 8;
      } else {
        let embeddedImg = null;
        try {
          embeddedImg = imgData.isJpg ? await pdfDoc.embedJpg(imgData.bytes) : await pdfDoc.embedPng(imgData.bytes);
        } catch {
          try {
            embeddedImg = imgData.isJpg ? await pdfDoc.embedPng(imgData.bytes) : await pdfDoc.embedJpg(imgData.bytes);
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
          const drawW = imgAspect > boxAspect ? CARD_IMG_W : CARD_IMG_H * imgAspect;
          const drawH = imgAspect > boxAspect ? CARD_IMG_W / imgAspect : CARD_IMG_H;
          const drawX = imgAspect > boxAspect ? imgBoxX : imgBoxX + (CARD_IMG_W - drawW) / 2;
          const drawY = imgAspect > boxAspect ? imgBoxY + (CARD_IMG_H - drawH) / 2 : imgBoxY;
          activePage.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });
        }
        curY -= TOTAL_CARD_H + 10;
      }
    }
    curY -= 6;
  }
};
