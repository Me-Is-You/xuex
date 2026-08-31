'use client';
/* 客户端通用工具：用户上下文（演示环境角色切换）+ API 请求 + 下载 */

export type Role = 'student' | 'teacher' | 'admin' | 'parent';
export type User = { id: string; name: string; role: Role; phone?: string; major?: string };

const STORAGE_KEY = 'xuex.currentUser';
export const DEFAULT_USER: User = { id: 'jiang2027', name: '江同学', role: 'student' };

export function getCurrentUser(): User {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_USER, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_USER;
}

export function setCurrentUser(u: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
}

/** 请求头：携带当前用户（角色/数据级权限依据） */
export function apiHeaders(init?: HeadersInit): HeadersInit {
  const u = getCurrentUser();
  return {
    ...(init as Record<string, string>),
    'X-User-Id': u.id,
    'X-User-Name': u.name,
  };
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...apiHeaders() },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

/** 触发浏览器 CSV 下载 */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const x = new Date(d);
  return `${x.getMonth() + 1}/${x.getDate()}`;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const x = new Date(d);
  return `${x.getMonth() + 1}/${x.getDate()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export const SUBJECT_LABEL: Record<string, string> = { Math: '数学', English: '英语', BigData: '大数据技术' };
export const TYPE_LABEL: Record<string, string> = { video: '视频课程', slide: '互动课件', ebook: '电子教材', lab: '虚拟仿真' };
export const STATUS_LABEL: Record<string, string> = { draft: '草稿', pending: '待审核', published: '已上架', offline: '已下架' };
export const KP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  mastered: { label: '已掌握', color: '#3a754e', bg: '#e1eee5' },
  learning: { label: '学习中', color: '#2563eb', bg: '#dbeafe' },
  weak: { label: '薄弱点', color: '#ea580c', bg: '#ffedd5' },
  untouched: { label: '未开始', color: '#94a3b8', bg: '#f1f5f9' },
};
