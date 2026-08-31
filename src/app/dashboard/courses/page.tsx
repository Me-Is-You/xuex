'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Play, FileText, BookOpen, FlaskConical, Search, Clock, Star, Users, Tag } from 'lucide-react';
import Link from 'next/link';
import { api, SUBJECT_LABEL, TYPE_LABEL, STATUS_LABEL, fmtDuration } from '@/lib/client';

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <Play size={12} fill="currentColor" />,
  slide: <FileText size={12} />,
  ebook: <BookOpen size={12} />,
  lab: <FlaskConical size={12} />,
};

export default function ResourceCenter() {
  const [rows, setRows] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [tag, setTag] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<any>(null);

  const buildQs = (kw: string) => {
    const qs = new URLSearchParams();
    if (kw) qs.set('keyword', kw);
    if (subject) qs.set('subject', subject);
    if (type) qs.set('type', type);
    if (tag) qs.set('tag', tag);
    if (difficulty) qs.set('difficulty', difficulty);
    qs.set('status', 'published');
    return qs.toString();
  };

  const fetchRows = async (kw: string) => {
    const data = await api<any[]>(`/api/resources?${buildQs(kw)}`).catch(() => [] as any[]);
    setRows(data);
    setLoading(false);
  };

  // 筛选变更 → 立即反馈 + 重新拉取（事件处理器内可同步 setState）
  const load = (kw: string) => {
    setLoading(true);
    void fetchRows(kw);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await api<any[]>(`/api/resources?${buildQs(keyword)}`).catch(() => [] as any[]);
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subject, type, tag, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  // 搜索防抖（全文检索：标题/标签/描述/知识点）
  const onSearch = (v: string) => {
    setKeyword(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 350);
  };

  const allTags = [...new Set(rows.flatMap((r) => r.tags ?? []))].slice(0, 14);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold">资源中心</h2>
        <p className="text-slate-500 text-sm mt-1">多模态学习资源 · AI 智能标注 · 全文检索 · 统一播放器</p>
      </div>

      {/* 检索栏 */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={keyword}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索标题 / 标签 / 知识点 / 字幕文本…"
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['', 'Math', 'English'] as const).map((s) => (
            <button key={s} onClick={() => setSubject(s)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${subject === s ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
              {s === '' ? '全部学科' : SUBJECT_LABEL[s]}
            </button>
          ))}
          <span className="w-px bg-slate-100 mx-1" />
          {(['', 'video', 'slide', 'ebook', 'lab'] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${type === t ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
              {t && TYPE_ICON[t]} {t === '' ? '全部类型' : TYPE_LABEL[t]}
            </button>
          ))}
          <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setLoading(true); }} className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-100">
            <option value="">全部难度</option>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>难度 {d}</option>)}
          </select>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag size={12} className="text-slate-300" />
            {allTags.map((t) => (
              <button key={t} onClick={() => { setTag(tag === t ? '' : t); setLoading(true); }} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${tag === t ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-leaf-50'}`}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 资源卡片 */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-leaf-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400 text-sm">未找到匹配资源，换个关键词试试</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/courses/${r.id}`}
              className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex-col"
            >
              <div className={`h-40 bg-gradient-to-br ${r.coverColor} relative flex items-center justify-center`}>
                {r.type === 'video' ? (
                  <div className="w-14 h-14 bg-white/25 backdrop-blur rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="text-white w-7 h-7" fill="white" />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-white/25 backdrop-blur rounded-2xl flex items-center justify-center text-white">
                    {r.type === 'slide' ? <FileText size={28} /> : r.type === 'ebook' ? <BookOpen size={28} /> : <FlaskConical size={28} />}
                  </div>
                )}
                <span className="absolute top-3 right-3 bg-black/25 backdrop-blur px-2.5 py-1 rounded-lg text-white text-[10px] font-bold">
                  {TYPE_LABEL[r.type]}
                </span>
                {r.status === 'pending' && (
                  <span className="absolute top-3 left-3 bg-amber-400 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">待审核</span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-1 mb-2.5">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{SUBJECT_LABEL[r.subject]}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">难度 {r.difficulty}</span>
                  {r.grade && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded">{r.grade}</span>}
                </div>
                <h3 className="font-bold text-slate-900 mb-1.5 group-hover:text-leaf-600 transition-colors leading-snug">{r.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 flex-1">{r.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {(r.tags ?? []).slice(0, 3).map((t: string) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 bg-leaf-50 text-leaf-600 rounded-full font-bold">#{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Users size={12} /> {r.studentCount} 人在学
                  </span>
                  <span className="flex items-center gap-1.5">
                    {r.durationSec > 0 && <><Clock size={12} /> {fmtDuration(r.durationSec)}</>}
                    {r.instructor}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
