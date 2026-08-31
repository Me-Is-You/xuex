'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, HelpCircle,
  BrainCircuit, Timer, Shuffle, Target, ListPlus, RefreshCw, ArrowRight, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { api, fmtDuration, SUBJECT_LABEL } from '@/lib/client';
import { useSearchParams } from 'next/navigation';

type Question = {
  id: number; subject: string; category: string; content: string;
  options: string[]; answer: string; explanation: string | null;
  difficulty: number; kpId: number | null; reasons?: string[];
};

type Mode = 'daily' | 'smart' | 'adaptive' | 'topic';

const MODE_META: Record<Mode, { label: string; desc: string; icon: React.ReactNode }> = {
  daily: { label: '每日训练', desc: '固定 5 题，保持手感', icon: <Timer size={15} /> },
  smart: { label: '智能推题', desc: 'AI 推荐引擎按画像推题', icon: <BrainCircuit size={15} /> },
  adaptive: { label: '自适应测评', desc: '按正确率动态调整难度', icon: <TrendingUp size={15} /> },
  topic: { label: '专项练习', desc: '按知识点/学科定向突破', icon: <Target size={15} /> },
};

export default function PracticePageWrapper() {
  return (
    <Suspense fallback={null}>
      <PracticePage />
    </Suspense>
  );
}

function PracticePage() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  const [mode, setMode] = useState<Mode>('daily');
  const [subject, setSubject] = useState<'all' | 'Math' | 'English'>('all');
  const [kpId, setKpId] = useState<number | null>(null);
  const [kps, setKps] = useState<any[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<any[]>([]); // 会话内答题记录
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [adaptiveNote, setAdaptiveNote] = useState('');
  const [adaptiveDiff, setAdaptiveDiff] = useState(3);
  const [notice, setNotice] = useState('');
  const [wrongThisRound, setWrongThisRound] = useState<number[]>([]);
  const qStartRef = useRef(0);
  const totalRef = useRef(30);

  const loadKps = useCallback(() => {
    api('/api/knowledge-graph').then((d) => setKps(d.nodes)).catch(() => {});
  }, []);
  useEffect(() => loadKps(), [loadKps]);

  // 会话计时
  useEffect(() => {
    if (finished || loading) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished, loading]);

  // 纯拉取（无 setState）：按模式/筛选取题
  const fetchSession = useCallback(async (m: Mode): Promise<{ qs: Question[]; note: string }> => {
    if (m === 'adaptive') {
      // 首题由服务端按难度取
      const q = await api<Question>('/api/recommend/adaptive', { method: 'POST', body: { difficulty: 3, subject: subject === 'all' ? undefined : subject, kpId: kpId ?? undefined } });
      return { qs: q ? [q] : [], note: '初始难度 3，将随正确率动态调整' };
    }
    if (m === 'smart') {
      const recs = await api<Question[]>('/api/recommend?count=5&subject=' + (subject === 'all' ? '' : subject) + (kpId ? '&kpId=' + kpId : ''));
      return { qs: recs, note: '' };
    }
    if (m === 'topic') {
      const all = await api<Question[]>(`/api/questions?limit=100&subject=${subject === 'all' ? '' : subject}${kpId ? '&kpId=' + kpId : ''}`);
      if (focusId) {
        const q = all.find((x) => x.id === Number(focusId));
        if (q) {
          const pool = all.filter((x) => x.id !== q.id && (q.kpId ? x.kpId === q.kpId : x.subject === q.subject));
          return { qs: [q, ...pool].slice(0, 5), note: '' };
        }
      }
      return { qs: all.sort(() => 0.5 - Math.random()).slice(0, 5), note: '' };
    }
    const qs = await api<Question[]>('/api/questions/daily');
    return { qs, note: '' };
  }, [subject, kpId, focusId]);

  // 统一应用会话状态（在 await 之后调用，合规）
  const applySession = useCallback((m: Mode, qs: Question[], note: string) => {
    setQuestions(qs);
    setAnswers([]);
    setCurrent(0);
    setSelected(null);
    setShowResult(false);
    setSeconds(0);
    setFinished(false);
    setWrongThisRound([]);
    totalRef.current = 0;
    if (m === 'adaptive') {
      setAdaptiveDiff(3);
      setAdaptiveNote(note);
    }
    qStartRef.current = Date.now();
    setLoading(false);
  }, []);

  // 手动「再练一组」等事件入口
  const startSession = useCallback(async (m: Mode) => {
    const r = await fetchSession(m).catch(() => ({ qs: [] as Question[], note: '' }));
    applySession(m, r.qs, r.note);
  }, [fetchSession, applySession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchSession(mode);
        if (!cancelled) applySession(mode, r.qs, r.note);
      } catch (e: any) {
        if (!cancelled) {
          setNotice(e.message);
          applySession(mode, [], '');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [mode, fetchSession, applySession]);

  const submit = async () => {
    if (!selected) return;
    const q = questions[current];
    const isCorrect = selected === q.answer;
    totalRef.current += 1;
    setShowResult(true);
    if (!isCorrect) setWrongThisRound((w) => [...w, q.id]);
    try {
      await api('/api/progress', { method: 'POST', body: { questionId: q.id, isCorrect, duration: Math.round((Date.now() - qStartRef.current) / 1000) } });
      setAnswers((a) => [...a, { questionId: q.id, isCorrect }]);
    } catch {
      // 记录失败不阻塞
    }
    qStartRef.current = Date.now();
  };

  const next = async () => {
    const q = questions[current];
    if (mode === 'adaptive') {
      // 自适应：按最近 5 题正确率调整难度并取下一题
      const recent = answers.slice(-4);
      const withCur = [...recent, { isCorrect: selected === q.answer }];
      const tail = withCur.slice(-5);
      const rate = tail.length >= 3 ? tail.filter((x) => x.isCorrect).length / tail.length : null;
      let diff = adaptiveDiff;
      if (rate !== null) {
        if (rate >= 0.8) diff = Math.min(5, diff + 1);
        else if (rate <= 0.4) diff = Math.max(1, diff - 1);
      }
      setAdaptiveDiff(diff);
      setAdaptiveNote(
        rate === null ? '样本积累中，维持难度 ' + diff
          : rate >= 0.8 ? `近 5 题正确率 ${Math.round(rate * 100)}%，难度上调至 ${diff}`
          : rate <= 0.4 ? `近 5 题正确率 ${Math.round(rate * 100)}%，难度下调至 ${diff} 巩固基础`
          : `正确率 ${Math.round(rate * 100)}%，维持难度 ${diff}`,
      );
      const excludeIds = questions.map((x) => x.id);
      const nq = await api<Question>('/api/recommend/adaptive', {
        method: 'POST',
        body: { difficulty: diff, excludeIds, subject: subject === 'all' ? undefined : subject, kpId: kpId ?? undefined },
      }).catch(() => null);
      if (nq) {
        setQuestions((qs) => [...qs, nq]);
      } else {
        setFinished(true);
      }
    }
    if (current >= questions.length - 1 && mode !== 'adaptive') {
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setShowResult(false);
    qStartRef.current = Date.now();
  };

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const rate = answers.length ? Math.round((correctCount / answers.length) * 100) : 0;

  /* ---------- 结算页 ---------- */
  if (finished) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-2xl p-10 md:p-12 text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${rate >= 70 ? 'bg-leaf-100 text-leaf-600' : 'bg-orange-100 text-orange-500'}`}>
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-2">本轮练习完成！</h2>
        <p className="text-slate-500 mb-8">
          {rate >= 80 ? '表现非常出色，保持这个节奏！' : rate >= 60 ? '不错！错题已自动归集，建议 48h 内重练。' : '别灰心，薄弱点已定位，智能推题会帮你定向补强。'}
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 p-5 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">正确率</div>
            <div className="text-3xl font-black">{rate}%</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">题数</div>
            <div className="text-3xl font-black">{answers.length}</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">用时</div>
            <div className="text-3xl font-black">{fmtDuration(seconds)}</div>
          </div>
        </div>
        {wrongThisRound.length > 0 && (
          <div className="p-4 bg-orange-50 rounded-2xl mb-8 text-left">
            <div className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1.5">
              <AlertCircle size={14} /> 本轮 {wrongThisRound.length} 道错题已自动归集错题本
            </div>
            <Link href="/dashboard/error-book" className="text-xs font-bold text-orange-600 flex items-center gap-1">
              去错题本重练 / 看相似题推荐 <ArrowRight size={12} />
            </Link>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all">返回控制台</Link>
          <button onClick={() => { setLoading(true); startSession(mode); }} className="bg-white border border-slate-200 text-slate-700 px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <RefreshCw size={15} /> 再练一组
          </button>
          <Link href="/dashboard/analytics" className="bg-leaf-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-leaf-700 transition-all">查看诊断报告</Link>
        </div>
      </motion.div>
    );
  }

  const q = questions[current];
  const isAdaptiveLast = mode === 'adaptive' && current === questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 模式选择 */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setNotice(''); setLoading(true); }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all ${mode === m ? 'border-leaf-500 bg-leaf-50' : 'border-slate-100 hover:border-leaf-200'}`}
            >
              <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${mode === m ? 'text-leaf-700' : 'text-slate-600'}`}>
                {MODE_META[m].icon} {MODE_META[m].label}
              </div>
              <div className="text-[10px] text-slate-400 leading-snug">{MODE_META[m].desc}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'Math', 'English'] as const).map((s) => (
            <button key={s} onClick={() => { setSubject(s); setLoading(true); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${subject === s ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              {s === 'all' ? '全部学科' : SUBJECT_LABEL[s]}
            </button>
          ))}
          <select
            value={kpId ?? ''}
            onChange={(e) => { setKpId(e.target.value ? Number(e.target.value) : null); setLoading(true); }}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-100 focus:outline-none"
          >
            <option value="">全部知识点</option>
            {kps.map((k) => (
              <option key={k.id} value={k.id}>{k.subject === 'Math' ? '数学' : '英语'}·{k.name}</option>
            ))}
          </select>
          {adaptiveNote && mode === 'adaptive' && (
            <span className="ml-auto text-[11px] font-bold text-leaf-600 bg-leaf-50 px-3 py-1.5 rounded-full">{adaptiveNote}</span>
          )}
        </div>
        {notice && <div className="text-xs font-bold text-red-500">{notice}</div>}
      </div>

      {/* 题目区 */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-leaf-600" />
        </div>
      ) : !q ? (
        <div className="text-center py-32 text-slate-400 text-sm">没有符合条件的题目，换个筛选条件试试。</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <span className="px-2 py-1 bg-slate-50 rounded-lg">第 {current + 1} 题{mode === 'adaptive' ? ` / 共 ${questions.length} 题` : ` / ${questions.length} 题`}</span>
                <span className={`px-2 py-1 rounded-lg ${q.subject === 'Math' ? 'bg-leaf-50 text-leaf-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  {SUBJECT_LABEL[q.subject]} · {q.category} · 难度 {q.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500">
                <Timer size={14} /> {fmtDuration(seconds)}
              </div>
            </div>

            {q.reasons && q.reasons.length > 0 && (
              <div className="px-6 pt-4 flex flex-wrap gap-1.5">
                {q.reasons.map((r, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold">✨ {r}</span>
                ))}
              </div>
            )}

            <div className="p-6 md:p-10">
              <h3 className="text-lg md:text-xl font-bold leading-relaxed text-slate-800 mb-8 whitespace-pre-line">{q.content}</h3>
              <div className="grid gap-3 mb-8">
                {q.options.map((opt, idx) => {
                  const isSel = selected === opt;
                  const isCorrect = showResult && opt === q.answer;
                  const isWrong = showResult && isSel && opt !== q.answer;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelected(opt)}
                      disabled={showResult}
                      className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all ${
                        isCorrect ? 'border-leaf-500 bg-leaf-50' : isWrong ? 'border-red-400 bg-red-50' : isSel ? 'border-leaf-600 bg-leaf-50' : 'border-slate-100 hover:border-leaf-200 hover:bg-leaf-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isSel ? 'text-leaf-700' : 'text-slate-700'}`}>
                          <span className="inline-block w-6 h-6 mr-2 rounded-lg bg-slate-100 text-center text-xs font-bold leading-6">{String.fromCharCode(65 + idx)}</span>
                          {opt}
                        </span>
                        {isCorrect && <CheckCircle2 className="text-leaf-500" />}
                        {isWrong && <AlertCircle className="text-red-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                    <HelpCircle size={16} className="text-leaf-600" />
                    解析 {selected !== q.answer && <span className="text-red-500 text-xs">（本题已记入错题本）</span>}
                  </div>
                  <p className="text-[13px] text-slate-600 leading-relaxed">{q.explanation}</p>
                </motion.div>
              )}

              <div className="flex items-center justify-between">
                <button onClick={() => setFinished(true)} className="text-xs font-bold text-slate-400 hover:text-slate-600">结束本轮</button>
                {!showResult ? (
                  <button onClick={submit} disabled={!selected} className={`px-8 py-3.5 rounded-2xl font-bold transition-all ${selected ? 'bg-leaf-600 text-white hover:bg-leaf-700 shadow-lg shadow-leaf-100' : 'bg-slate-100 text-slate-400'}`}>
                    提交答案
                  </button>
                ) : (
                  <button onClick={next} className="px-8 py-3.5 rounded-2xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-2">
                    {isAdaptiveLast ? '完成测评' : '下一题'} <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
