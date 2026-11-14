import { DelegateWithStatus } from '../../../services/supervisor';

export type ReportType = 'supervisor_report' | 'advance';

/** Filters branch delegates matching a minimum 2-character name/code/phone/plate query. */
export function filterReportDelegates(
  branchDelegates: DelegateWithStatus[],
  searchQuery: string
): DelegateWithStatus[] {
  const q = searchQuery.trim().toLowerCase();
  if (q.length < 2) return [];
  return branchDelegates
    .filter((d) => {
      const name = (d.name || '').toLowerCase();
      const num = (d.employee_number || '').toLowerCase();
      const phone = (d.phone || '').toLowerCase();
      const bike = (d.motorcycle_number || '').toLowerCase();
      return name.includes(q) || num.includes(q) || phone.includes(q) || bike.includes(q);
    })
    .slice(0, 8);
}

const DIALECT_MAP: [RegExp, string][] = [
  [/\b(مش راضي|ما بدو|ما يبي|ما بيرضى|مش موافق)\b/gi, 'يرفض'],
  [/\b(مش عايز|مش عاوز|مش حابب|ما وده)\b/gi, 'لا يرغب في'],
  [/\b(مش بيسمع الكلام|مابيردش على التعليمات)\b/gi, 'عدم الالتزام بالتعليمات'],
  [/\b(مش ملتزم|مش منضبط)\b/gi, 'غير ملتزم'],
  [/\b(عمال يتاخر|بيتاخر كتير|دايما بيتاخر|عم يتأخر|بيتاخر)\b/gi, 'يتأخر باستمرار عن مواعيد العمل'],
  [/\b(تاخير كتير|تأخير كتير)\b/gi, 'تأخر متكرر'],
  [/\b(ما جاش|مجاش|ما حضرش|ما اجا|ماجا)\b/gi, 'لم يحضر للعمل'],
  [/\b(ساب الشغل|سيب الوردية|سيب الشغل|ساب الوردية)\b/gi, 'ترك الوردية دون إذن'],
  [/\b(اختفى|هرب|مش لاقينه|مش لاقيه)\b/gi, 'تعذر الوصول إليه في موقع العمل'],
  [/\b(مردش عليا|ما ردش عليا|ما ردش|مش بيرد|مابيردش|ما بيجاوب|قفل في وشي)\b/gi, 'لا يستجيب للاتصالات'],
  [/\b(تليفون|موبايل|جوال)\b/gi, 'الهاتف'],
  [/\b(مقفول|تليفونه مقفول)\b/gi, 'مغلق'],
  [/\b(يروح يسلم|يروح يوصل)\b/gi, 'التوجه لتسليم'],
  [/\b(اوردرات|أوردرات)\b/gi, 'طلبات'],
  [/\b(اوردر|أوردر)\b/gi, 'طلب'],
  [/\b(كنسل الاوردر|كنسل الطلب)\b/gi, 'ألغى الطلب'],
  [/\b(دباب|موتوسيكل|سيكل)\b/gi, 'المركبة'],
  [/\b(اتخبط|خبط|صدم|عمل حادثة|وقع بالدباب)\b/gi, 'تعرض لحادث مروري'],
  [/\b(باظ|عطلان|خربان|خرب|مش شغال)\b/gi, 'معطل'],
  [/\b(زبون|الزبون)\b/gi, 'العميل'],
  [/\b(اتخانق مع|بيزعق مع|مسك في)\b/gi, 'حدث خلاف وتلاسن مع'],
  [/\b(بيعمل مشاكل)\b/gi, 'يثير خلافات تشغيلية'],
  [/\b(علشان|عشان|كرمال)\b/gi, 'بسبب'],
  [/\b(دلوقتي|هلق|الحين)\b/gi, 'حالياً'],
  [/\b(كويس|منيح)\b/gi, 'بشكل مناسب'],
  [/\b(شوية|شوي)\b/gi, 'قليلاً'],
  [/\b(كتير اوي|كتير|واجد)\b/gi, 'بشكل ملحوظ'],
  [/\b(معاهوش|معهوش|ما معه|مش معاه)\b/gi, 'لا يتوفر لديه'],
  [/\b(فلوس)\b/gi, 'مبلغ مالي'],
  [/\b(بصراحة|يعني|اصلا|أصلاً)\b/gi, ''],
  [/\b(عاوز سلفة|عايز سلفة|بدي سلفة|محتاج سلفة)\b/gi, 'طلب سلفة مالية'],
  [/\b(ابنه تعبان|ابنه عيان)\b/gi, 'ظرف صحي يمر به ابنه'],
  [/\b(والده تعبان|والدته تعبانة)\b/gi, 'ظرف صحي عائلي طارئ'],
  [/\b(علاج|يجيب علاج|دوا)\b/gi, 'توفير مستلزمات علاجية'],
  [/\b(ايجار|الإيجار متأخر)\b/gi, 'سداد التزامات إيجارية متأخرة'],
];

/** Converts colloquial supervisor notes into concise formal Arabic for reports or advance requests. */
export function rewriteArabicReportText(rawText: string, reportType: ReportType): string {
  let text = rawText.trim();
  for (const [rgx, replacement] of DIALECT_MAP) {
    text = text.replace(rgx, replacement);
  }

  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ ,/g, '،')
    .replace(/,/g, '،')
    .trim();

  if (reportType === 'advance' && !text.startsWith('طلب سلفة')) {
    text = `طلب سلفة: ${text}`;
  }

  if (text && !/[.!?،。]$/.test(text)) {
    text += '.';
  }
  return text;
}
