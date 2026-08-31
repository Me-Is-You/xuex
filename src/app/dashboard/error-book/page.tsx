'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BrainCircuit, RefreshCw, CheckCircle2, Sparkles, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { api, SUBJECT_LABEL, fmtDateTime } from '@/lib/client';
import { useUser } from '@/lib/user-context';

export default function ErrorBookPage() {
  const { user } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [kps, setKps] = useState<any[]>([]);
  const [filterKp, setFilterKp] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (filterKp) qs.set('kpId', String(filterKp));
    if (showAll) qs.set('show', 'all');
    api(`/api/wrongbook?${qs.toString()}`).then(setItems).catch(() => {});
    api('/api/knowledge-graph').then((d) => setKps(d.nodes)).catch(() => {});
  }, [filterKp, showAll]);

  useEffect(() => {
    load();
  }, [load, user.id]);

  const toggleMastered = async (id: number, mastered: boolean) => {
    await api(`/api/wrongbook/${id}`, { method: 'PATCH', body: { mastered } }).catch(() => {});
    load();
  };

  const fetchSimilar = async (questionId: number) => {
    setExpanded(questionId);
    const d = await api<{ similar: any[] }>(`/api/wrongbook`, { method: 'POST', body: { questionId } }).catch(() => ({ similar: [] }));
    setSimilar(d.similar);
  };

  const kpCount = (kpId: number) => items.filter((i) => i.kpId === kpId).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <BrainCircuit className="text-leaf-600" /> 智能错题本
          </h2>
          <p className="text-slate-500 text-sm mt-1">答题错误自动归集 · 按知识点分类 · 重练与相似题推荐</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-leaf-600" />
          显示已掌握
        </label>
      </div>

      {/* 知识点分类筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setFilterKp(null)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${!filterKp ? 'bg-leaf-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
          全部（{items.length}）
        </button>
        {kps.map((k) => (
          <button key={k.id} onClick={() => setFilterKp(filterKp === k.id ? null : k.id)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filterKp === k.id ? 'bg-leaf-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
            {SUBJECT_LABEL[k.subject]}·{k.name}（{kpCount(k.id)}）
          </button>
        ))}
      </div>

      {notice && <div className="text-xs font-bold text-red-500">{notice}</div>}

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
          <CheckCircle2 className="w-14 h-14 text-leaf-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">太棒了，没有待重练的错题！</h3>
          <p className="text-sm text-slate-400 mb-6">去练一组题，错题会自动归集到这里。</p>
          <Link href="/dashboard/practice" className="inline-block bg-leaf-600 text-white px-6 py-3 rounded-xl font-bold text-sm">开始练习</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const q = item.question;
            const isOpen = expanded === q.id;
            return (
              <div key={item.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${item.mastered ? 'border-slate-100 opacity-70' : 'border-slate-100'}`}>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.subject === 'Math' ? 'bg-leaf-50 text-leaf-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {SUBJECT_LABEL[q.subject]} · {q.category}
                    </span>
                    {item.kpName && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600">📍 {item.kpName}</span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500">难度 {q.difficulty}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500">错 {item.wrongCount} 次</span>
                    <span className="text-[10px] text-slate-300 ml-auto">{fmtDateTime(item.lastWrongAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed mb-3 whitespace-pre-line">{q.content}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <button
                      onClick={() => fetchSimilar(q.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-leaf-50 text-leaf-700 rounded-xl font-bold hover:bg-leaf-100 transition-colors"
                    >
                      <Sparkles size={13} /> 相似题推荐
                    </button>
                    <button
                      onClick={() => toggleMastered(item.id, !item.mastered)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-colors ${item.mastered ? 'bg-slate-50 text-slate-400 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {item.mastered ? <><RefreshCw size={13} /> 重新归集</> : <><CheckCircle2 size={13} /> 标记已掌握</>}
                    </button>
                    <Link href={`/dashboard/practice?focus=${q.id}`} className="text-leaf-600 font-bold hover:underline">
                      重练此题 →
                    </Link>
                    <button onClick={() => setExpanded(isOpen ? null : q.id)} className="ml-auto flex items-center gap-1 text-slate-400 font-bold">
                      解析 {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-6 pb-6">
                    <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                      <div className="flex items-center gap-2 text-xs font-bold mb-1.5">
                        <HelpCircle size={13} className="text-leaf-600" /> 正确答案：{q.answer}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{q.explanation}</p>
                    </div>
                    {isOpen && similar.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-slate-500 mb-2">📚 相似题（同知识点 + 相近难度）</div>
                        <div className="space-y-2">
                          {similar.map((s: any) => (
                            <Link key={s.id} href={`/dashboard/practice?focus=${s.id}`} className="block p-3 rounded-xl border border-slate-50 hover:border-leaf-100 hover:bg-leaf-50/30 transition-all">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-1">
                                <span>{SUBJECT_LABEL[s.subject]} · {s.category}</span>
                                <span>难度 {s.difficulty}</span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-1">{s.content}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
