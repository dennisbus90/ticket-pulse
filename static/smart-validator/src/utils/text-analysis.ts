export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sentenceCount(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return sentences.length;
}

export function getSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function containsKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

export function countPattern(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

const VAGUE_WORDS = [
  'properly',
  'correctly',
  'appropriately',
  'as needed',
  'etc',
  'and so on',
  'various',
  'some',
  'somehow',
  'adequate',
  'reasonable',
  'suitable',
  'good',
  'nice',
  'better',
  'easy',
  'simple',
  'obvious',
  'clearly',
];

export function findVagueWords(text: string): string[] {
  const lower = text.toLowerCase();
  return VAGUE_WORDS.filter((word) => {
    const pattern = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return pattern.test(lower);
  });
}

const SAFE_ACRONYMS = new Set([
  'API', 'URL', 'UI', 'UX', 'ID', 'HTML', 'CSS', 'JS', 'TS',
  'HTTP', 'HTTPS', 'REST', 'JSON', 'XML', 'SQL', 'DB', 'CI', 'CD',
  'PR', 'QA', 'UAT', 'SLA', 'MVP', 'POC', 'SSO', 'JWT', 'OAuth',
  'AWS', 'GCP', 'SDK', 'CLI', 'PDF', 'CSV', 'CRUD', 'DNS', 'SSH',
  'AC', 'DoD',
]);

export function findUndefinedAcronyms(text: string): string[] {
  const matches = text.match(/\b[A-Z]{2,}\b/g) || [];
  const unique = [...new Set(matches)];
  return unique.filter((acronym) => !SAFE_ACRONYMS.has(acronym));
}

export function isPassiveVoice(sentence: string): boolean {
  return /\b(?:is|are|was|were|been|being|be)\s+\w+(?:ed|en|t)\b/i.test(sentence);
}

export function parseBulletItems(text: string): string[] {
  const lines = text.split('\n');
  const items: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      items.push(trimmed.replace(/^[-*•]\s+|^\d+[.)]\s+/, ''));
    }
  }
  // If no bullet items found, treat non-empty lines as items
  if (items.length === 0) {
    return lines.map((l) => l.trim()).filter((l) => l.length > 0);
  }
  return items;
}
