'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play, Pause, Camera, Captions, Gauge, Clock, ArrowLeft, Plus, StickyNote,
  CheckCircle2, CloudUpload, CloudOff, Wifi, Network,
} from 'lucide-react';
import { api, SUBJECT_LABEL, TYPE_LABEL, fmtDuration } from '@/lib/client';

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [subs, setSubs] = useState(true);
  const [syncState, setSyncState] = useState<'synced' | 'pending' | 'offline'>('synced');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [related, setRelated] = useState<any>(null);
  const [resumed, setResumed] = useState(false);
  const posRef = useRef(0);
  const saveTimer = useRef<any>(null);

  const res = data?.resource;

  // 加载资源 + 断点续学
  useEffect(() => {
    api(`/api/resources/${id}`)
      .then((d) => {
        setData(d);
        if (d.progress && d.progress.lastPositionSec > 30) {
          posRef.current = d.progress.lastPositionSec;
          setPos(d.progress.lastPositionSec);
          setResumed(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [id]);

  // 关联推荐（学习路径导航：前置/后续/相关）
  useEffect(() => {
    if (res?.kpId) api(`/api/related-kps?kpId=${res.kpId}`).then(setRelated).catch(() => {});
  }, [res?.kpId]);

  // 模拟播放（按倍速推进）
  useEffect(() => {
    if (!playing || !res) return;
    const t = setInterval(() => {
      posRef.current = Math.min((res.durationSec || 1800), posRef.current + speed);
      setPos(posRef.current);
      if (posRef.current >= (res.durationSec || 1800)) setPlaying(false);
    }, 1000);
    return () => clearInterval(t);
  }, [playing, speed, res]);

  const saveProgress = useCallback(
    (p: number) => {
      if (!res) return;
      setSyncState('pending');
      api('/api/course-progress', {
        method: 'POST',
        body: { resourceId: res.id, positionSec: Math.floor(p), totalSec: res.durationSec || 1800, completed: p >= (res.durationSec || 1800) },
      })
        .then(() => setSyncState('synced'))
        .catch(() => setSyncState('offline'));
    },
    [res],
  );

  // 每 10 秒自动同步（多端同步 / 断点续学）
  useEffect(() => {
    if (!res) return;
    saveTimer.current = setInterval(() => {
      if (navigator.onLine === false) {
        setSyncState('offline');
      } else {
        saveProgress(posRef.current);
      }
    }, 10000);
    return () => clearInterval(saveTimer.current);
  }, [res, saveProgress]);

  // 离开页面时保存
  useEffect(() => {
    return () => {
      if (posRef.current > 0) saveProgress(posRef.current);
    };
  }, [saveProgress]);

  const jumpTo = (pct: number) => {
    if (!res) return;
    posRef.current = Math.floor(((res.durationSec || 1800) * pct) / 100);
    setPos(posRef.current);
  };

  const addNote = async () => {
    if (!noteDraft.trim() || !res) return;
    await api(`/api/resources/${id}`, { method: 'POST', body: { content: noteDraft, positionSec: Math.floor(pos), title: `笔记 · ${fmtDuration(pos)}` } }).catch(() => {});
    setNoteDraft('');
    setNoteOpen(false);
    api(`/api/resources/${id}`).then((d: any) => setData(d)).catch(() => {});
  };

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto text-center py-32">
        <p className="text-slate-400 mb-6">资源不存在或已下架</p>
        <Link href="/dashboard/courses" className="text-leaf-600 font-bold text-sm">← 返回资源中心</Link>
      </div>
    );
  }
  if (!data) {
    return <div className="flex justify-center py-32"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-leaf-600" /></div>;
  }

  const total = res.durationSec || 1800;
  const pct = Math.min(100, Math.round((pos / total) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-leaf-600">
        <ArrowLeft size={16} /> 返回资源中心
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 播放器 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-slate-900 rounded-3xl relative overflow-hidden group shadow-2xl">
            {/* 模拟画面 */}
            <div className={`absolute inset-0 bg-gradient-to-br ${res.coverColor} opacity-40`} />
            <div className="absolute inset-0 flex items-center justify-center">
              {!playing ? (
                <button onClick={() => setPlaying(true)} className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105">
                  <Play size={36} className="text-white" fill="white" />
                </button>
              ) : (
                <div className="text-center">
                  <div className="w-3 h-3 bg-white/80 rounded-full mx-auto mb-3 animate-pulse" />
                  <p className="text-white/70 text-xs font-medium">
                    {SUBJECT_LABEL[res.subject]} · {res.title}（演示流）
                  </p>
                </div>
              )}
            </div>
            {/* 字幕切换 */}
            {subs && playing && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-md px-4 py-2 bg-black/60 backdrop-blur text-white text-xs rounded-xl text-center">
                {res.title} — 讲解中…（{speed}x）
              </div>
            )}
            {/* 同步状态 */}
            <div className="absolute top-4 right-4">
              {syncState === 'synced' && (
                <span className="flex items-center gap-1.5 bg-leaf-500/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
                  <CloudUpload size={12} /> 进度已同步
                </span>
              )}
              {syncState === 'pending' && (
                <span className="flex items-center gap-1.5 bg-amber-400/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
                  <CloudUpload size={12} className="animate-pulse" /> 同步中…
                </span>
              )}
              {syncState === 'offline' && (
                <span className="flex items-center gap-1.5 bg-slate-500/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full">
                  <CloudOff size={12} /> 离线缓存，联网后自动同步
                </span>
              )}
            </div>
            {/* 进度条 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => jumpTo(Number(e.target.value))}
                className="w-full accent-leaf-500 cursor-pointer"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPlaying((p) => !p)} className="w-9 h-9 bg-white/15 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/25">
                    {playing ? <Pause size={16} /> : <Play size={16} fill="white" />}
                  </button>
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="bg-white/15 backdrop-blur text-white text-[11px] font-bold rounded-lg px-2 py-1.5 [&>option]:text-slate-900">
                    {[0.5, 1, 1.5, 2].map((s) => <option key={s} value={s}>{s}x 倍速</option>)}
                  </select>
                  <button onClick={() => setSubs((s) => !s)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${subs ? 'bg-leaf-500 text-white' : 'bg-white/15 text-white'}`}>
                    <Captions size={14} />
                  </button>
                  <button onClick={() => setNoteOpen(true)} className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center text-white hover:bg-white/25" title="截图记笔记">
                    <Camera size={14} />
                  </button>
                </div>
                <span className="text-white/90 text-[11px] font-mono font-bold">
                  {fmtDuration(pos)} / {fmtDuration(total)}
                </span>
              </div>
            </div>
          </div>

          {/* 断点续学提示 */}
          {resumed && (
            <div className="flex items-center justify-between bg-leaf-50 border border-leaf-100 rounded-2xl px-5 py-3.5">
              <span className="text-xs font-bold text-leaf-700 flex items-center gap-2">
                <CheckCircle2 size={15} /> 断点续学：已从上次位置 {fmtDuration(pos)} 恢复（跨端同步）
              </span>
              <button onClick={() => { posRef.current = 0; setPos(0); setResumed(false); }} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                从头播放
              </button>
            </div>
          )}

          {/* 资源信息 */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg">{SUBJECT_LABEL[res.subject]}</span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg">{TYPE_LABEL[res.type]}</span>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-[11px] font-bold rounded-lg">难度 {res.difficulty}</span>
              {(res.tags ?? []).map((t: string) => (
                <span key={t} className="px-2.5 py-1 bg-leaf-50 text-leaf-600 text-[11px] font-bold rounded-lg">#{t}</span>
              ))}
            </div>
            <h1 className="text-2xl font-bold mb-2">{res.title}</h1>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{res.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="font-bold text-slate-600">{res.instructor}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {res.durationSec ? fmtDuration(res.durationSec) : '图文资源'}</span>
              <span>{res.studentCount} 人在学</span>
              <span>v{res.version}</span>
            </div>
          </div>
        </div>

        {/* 右侧：笔记 + 学习路径 */}
        <div className="space-y-6">
          {/* 我的笔记 */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2"><StickyNote className="text-amber-500" size={16} /> 我的笔记（{data.notes?.length ?? 0}）</h3>
              <button onClick={() => setNoteOpen(true)} className="text-[11px] font-bold text-leaf-600 flex items-center gap-1">
                <Plus size={12} /> 记笔记
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {(data.notes ?? []).length === 0 && (
                <p className="text-xs text-slate-300 text-center py-6">点击播放器 📷 按钮即可截图记笔记</p>
              )}
              {(data.notes ?? []).map((n: any) => (
                <div key={n.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-amber-600">{n.title}</span>
                    <button onClick={() => { posRef.current = n.positionSec; setPos(n.positionSec); setPlaying(true); }} className="text-[10px] font-bold text-slate-400 hover:text-leaf-600">
                      回到 {fmtDuration(n.positionSec)}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 学习路径导航（关联推荐） */}
          {res.kpId && (
            <div className="bg-white rounded-3xl border border-slate-100 p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Network className="text-leaf-600" size={16} /> 学习路径导航
              </h3>
              {related ? (
                <div className="space-y-4">
                  {([
                    ['📌 前置知识', related.prereq, '先学这些再进入当前内容'],
                    ['⏭️ 后续知识', related.next, '学完当前后的前进路径'],
                    ['🔗 相关扩展', related.related, '横向拓展内容'],
                  ] as Array<[string, any[], string]>).map(([label, items, hint]) => (
                    <div key={label}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">{label} <span className="normal-case font-medium">· {hint}</span></div>
                      {items.length === 0 ? (
                        <p className="text-xs text-slate-300">暂无</p>
                      ) : (
                        <div className="space-y-2">
                          {items.map((k: any) => (
                            <div key={k.id} className="p-2.5 rounded-xl border border-slate-50 hover:border-leaf-100 transition-colors">
                              <Link href={`/dashboard/graph?focus=${k.id}`} className="text-xs font-bold text-slate-700 hover:text-leaf-600 flex items-center gap-1.5">
                                {k.name} <ArrowLeft size={10} className="rotate-180" />
                              </Link>
                              {k.resource && (
                                <Link href={`/dashboard/courses/${k.resource.id}`} className="block text-[11px] text-slate-400 hover:text-leaf-600 mt-1">
                                   {k.resource.title}
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-leaf-600" /></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 记笔记弹窗 */}
      {noteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setNoteOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold mb-1">📷 截图记笔记</h3>
            <p className="text-xs text-slate-400 mb-4">已截取 {fmtDuration(pos)} 处画面（演示），写下你的理解：</p>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              className="w-full h-28 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 resize-none"
              placeholder="例如：洛必达必须 0/0 或 ∞/∞ 型…"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNoteOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">取消</button>
              <button onClick={addNote} className="px-5 py-2 bg-leaf-600 text-white text-xs font-bold rounded-xl hover:bg-leaf-700">保存笔记</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
