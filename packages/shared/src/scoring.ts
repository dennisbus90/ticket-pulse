export const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "and", "but", "or",
  "nor", "for", "yet", "so", "in", "on", "at", "to", "from", "by",
  "with", "as", "of", "into", "through", "during", "before", "after",
  "above", "below", "between", "out", "off", "over", "under", "again",
  "further", "then", "once", "i", "me", "my", "we", "our", "you",
  "your", "he", "him", "his", "she", "her", "it", "its", "they",
  "them", "their", "this", "that", "these", "those", "am", "not", "no",
  "up", "down", "if", "when", "where", "how", "what", "which", "who",
  "whom", "why", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "than", "too", "very", "just", "also",
  "about", "only", "same", "here", "there", "need", "needs", "like",
  "new", "use", "used", "using", "make", "add", "update", "get", "set",
  "able",
]);

export function normalizeText(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return new Set(words);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function computeSuggestion(
  tickets: Array<{ value: string | number; similarity: number }>,
): string | number | null {
  if (tickets.length === 0) return null;

  const allNumeric = tickets.every((t) => typeof t.value === "number");

  if (allNumeric) {
    const sorted = [...tickets].sort(
      (a, b) => (a.value as number) - (b.value as number),
    );
    const totalWeight = sorted.reduce((s, t) => s + t.similarity, 0);
    let cumWeight = 0;
    for (const t of sorted) {
      cumWeight += t.similarity;
      if (cumWeight >= totalWeight / 2) return t.value;
    }
    return sorted[sorted.length - 1].value;
  }

  const counts = new Map<string | number, number>();
  for (const t of tickets) {
    counts.set(t.value, (counts.get(t.value) ?? 0) + 1);
  }
  let best: string | number | null = null;
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}
