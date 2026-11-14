const DIALECT_REPLACEMENTS: [RegExp, string][] = [
  [/\b(عاوز سلفة|عايز سلفة|بدي سلفة|محتاج سلفة)\b/gi, 'طلب سلفة مالية'],
  [/\b(ابنه تعبان|ابنه عيان)\b/gi, 'ظرف صحي يمر به ابنه'],
  [/\b(والده تعبان|والدته تعبانة)\b/gi, 'ظرف صحي عائلي طارئ'],
  [/\b(علاج|يجيب علاج|دوا)\b/gi, 'توفير مستلزمات علاجية'],
  [/\b(ايجار|الإيجار متأخر)\b/gi, 'سداد التزامات إيجارية متأخرة'],
  [/\b(علشان|عشان|كرمال)\b/gi, 'بسبب'],
  [/\b(دلوقتي|هلق|الحين)\b/gi, 'حالياً'],
  [/\b(معاهوش|معهوش|ما معه|مش معاه)\b/gi, 'لا يتوفر لديه'],
  [/\b(فلوس)\b/gi, 'مبلغ مالي'],
  [/\b(كتير اوي|كتير|واجد)\b/gi, 'بشكل ملحوظ'],
  [/\b(بصراحة|يعني|اصلا|أصلاً)\b/gi, ''],
];

export const polishAdvanceReasonText = (rawReason: string): string => {
  let text = rawReason.trim();
  for (const [rgx, replacement] of DIALECT_REPLACEMENTS) {
    text = text.replace(rgx, replacement);
  }

  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ ,/g, '،')
    .replace(/,/g, '،')
    .trim();

  if (!text.startsWith('طلب سلفة')) {
    text = `طلب سلفة: ${text}`;
  }

  if (text && !/[.!?،。]$/.test(text)) {
    text += '.';
  }

  return text;
};
