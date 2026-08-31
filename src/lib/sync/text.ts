/** 文本指纹工具：归一化 / FNV-1a 精确哈希 / 字符 n-gram / Jaccard 相似度 */

export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** 归一化：小写 + 去空白/标点/全角符号（中文题与英文题通用） */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。！？；：、""''（）《》【】,.!?;:"'()\[\]{}|\\^~`@#$%&*+=/<>-]/g, '');
}

export function shingles(s: string, k = 6): Set<string> {
  const out = new Set<string>();
  if (s.length < k) return s.length ? new Set([s]) : out;
  for (let i = 0; i <= s.length - k; i++) out.add(s.slice(i, i + k));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const x of small) if (big.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
