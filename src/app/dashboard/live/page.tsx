'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Users, MessageCircle, Hand, Share2, Heart, BarChart2, Smile, Zap,
  Send, CheckCircle2, Mic,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api, fmtDuration } from '@/lib/client';
import { useUser } from '@/lib/user-context';

export default function LivePage() {
  const { user } = useUser();
  const [tab, setTab] = useState<'chat' | 'danmaku' | 'notes'>('chat');
  const [messages, setMessages] = useState([
    { id: 1, user: '李华', text: '老师，洛必达法则的适用前提能不能再讲一下？', time: '10:05' },
    { id: 2, user: '张伟', text: '这道题我算出来的结果是 1/2', time: '10:06' },
    { id: 3, user: '王芳', text: '666，这个技巧太牛了！', time: '10:07' },
  ]);
  const [draft, setDraft] = useState('');
  const [votes, setVotes] = useState<Record<string, number>>({ A: 182, B: 341, C: 96 });
  const [voted, setVoted] = useState<string | null>(null);
  const [signined, setSignined] = useState(false);
  const [micQueued, setMicQueued] = useState(false);
  const [danmaku, setDanmaku] = useState<string[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [liveSec, setLiveSec] = useState(3725);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setLiveSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [messages]);
  useEffect(() => {
    api('/api/resources/1').then((d) => setNotes(d.notes ?? [])).catch(() => {});
  }, []);

  const totalVotes = Object.values(votes).reduce((s, x) => s + x, 0);

  const send = (toDanmaku = false) => {
    if (!draft.trim()) return;
    const time = new Date().toTimeString().slice(0, 5);
    if (toDanmaku) {
      setDanmaku((d) => [...d.slice(-5), draft.trim()]);
    } else {
      setMessages((m) => [...m, { id: Date.now(), user: user.name, text: draft.trim(), time }]);
    }
    setDraft('');
  };

  const vote = (k: string) => {
    if (voted) return;
    setVoted(k);
    setVotes((v) => ({ ...v, [k]: v[k] + 1 }));
  };

  const signIn = async () => {
    setSignined(true);
    api('/api/track', { method: 'POST', body: { actionType: 'live_signin', entityId: 'math-live-04', meta: { course: '一元函数积分学深度攻克' } } }).catch(() => {});
  };

  const addNote = async () => {
    if (!noteDraft.trim()) return;
    await api('/api/resources/1', { method: 'POST', body: { content: noteDraft, positionSec: liveSec, title: `直播笔记 · ${fmtDuration(liveSec)}` } }).catch(() => {});
    setNoteDraft('');
    setNotes((n) => [{ id: Date.now(), title: `直播笔记 · ${fmtDuration(liveSec)}`, content: noteDraft, positionSec: liveSec }, ...n]);
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-150px)] flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* 左侧：直播 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="aspect-video bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Play className="text-blue-500 w-10 h-10" fill="currentColor" />
              </div>
              <p className="text-white/60 text-sm font-medium">2027 届高数直播间 · 正在播放（演示流）</p>
              <p className="text-white/40 text-xs mt-1 font-mono">{fmtDuration(liveSec)}</p>
            </div>
          </div>

          {/* 弹幕层 */}
          {tab === 'danmaku' && danmaku.map((d, i) => (
            <motion.div
              key={i}
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: -500, opacity: 1 }}
              transition={{ duration: 6, ease: 'linear' }}
              className="absolute top-6 left-0 text-xs font-bold text-white/90 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full pointer-events-none"
              style={{ top: `${12 + (i % 4) * 9}%` }}
            >
              {d}
            </motion.div>
          ))}

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full" /> 直播中
            </div>
            <div className="bg-black/40 backdrop-blur text-white px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
              <Users size={13} /> 1,284 观看
            </div>
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="bg-white/10 backdrop-blur text-white p-2.5 rounded-xl hover:bg-white/20"><Heart size={16} /></button>
            <button className="bg-white/10 backdrop-blur text-white p-2.5 rounded-xl hover:bg-white/20"><Share2 size={16} /></button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-bold leading-tight">2027 专升本高数：一元函数积分学深度攻克</h2>
            <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs mt-2">
              <span className="flex items-center gap-1.5 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 高等数学</span>
              <span>主讲：张剑峰教授</span>
              <span>课程代码：MATH-2027-04</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={signIn}
              disabled={signined}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${signined ? 'bg-leaf-100 text-leaf-600' : 'bg-leaf-600 text-white hover:bg-leaf-700'}`}
            >
              {signined ? <><CheckCircle2 size={14} /> 已签到</> : '一键签到'}
            </button>
            <button
              onClick={() => setMicQueued(true)}
              disabled={micQueued}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${micQueued ? 'bg-blue-100 text-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <Mic size={14} /> {micQueued ? '连麦排队中 (2/5)' : '申请连麦'}
            </button>
          </div>
        </div>

        {/* 随堂投票 */}
        <div className="mt-5 p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-3xl border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0">
              <BarChart2 size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-800">随堂投票：这道 0/0 型极限优先用什么方法？</h4>
              <span className="text-[10px] text-slate-400 font-bold">{totalVotes} 人已投{voted ? ` · 你选了 ${voted}` : ''}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">00:45</span>
          </div>
          <div className="space-y-2.5">
            {[['A', '洛必达法则'], ['B', '等价无穷小替换'], ['C', '泰勒公式']].map(([k, label]) => {
              const pct = Math.round((votes[k] / totalVotes) * 100);
              return (
                <button key={k} onClick={() => vote(k)} disabled={!!voted} className="relative w-full h-10 rounded-xl border border-blue-100 bg-white overflow-hidden text-left disabled:cursor-default">
                  <div className="absolute inset-y-0 left-0 bg-blue-50 transition-all duration-700" style={{ width: voted ? `${pct}%` : '0%' }} />
                  <div className="relative flex justify-between items-center px-4 h-full">
                    <span className={`text-[11px] font-bold ${voted === k ? 'text-blue-700' : 'text-slate-600'}`}>{k}. {label}</span>
                    {voted && <span className="text-[11px] font-black text-blue-600">{pct}%</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧：互动面板 */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[420px]">
        <div className="flex border-b border-slate-50">
          {([['chat', '互动聊天'], ['danmaku', '弹幕'], ['notes', `我的笔记`]] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-all ${tab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide min-h-0">
          {tab === 'chat' && messages.map((m) => (
            <div key={m.id} className="flex gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${m.user === user.name ? 'bg-leaf-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {m.user[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-900">{m.user}</span>
                  <span className="text-[9px] text-slate-400">{m.time}</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100/60">{m.text}</div>
              </div>
            </div>
          ))}
          {tab === 'notes' && (
            <div className="space-y-3">
              {notes.length === 0 && (
                <div className="text-center py-16 text-slate-300 text-xs">
                  <Zap size={28} className="mx-auto mb-3 opacity-30" />
                  直播中点 📝 随时记录，课后自动归入资源笔记
                </div>
              )}
              {notes.map((n: any) => (
                <div key={n.id} className="p-3.5 bg-amber-50/50 border border-amber-100/60 rounded-2xl">
                  <div className="text-[10px] font-bold text-amber-600 mb-1">{n.title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'danmaku' && (
            <div className="text-center py-16 text-xs text-slate-300">
              发送的消息将以弹幕形式飘过直播间画面
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-50 space-y-2">
          {tab === 'notes' ? (
            <div className="flex gap-2">
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="记录此刻的要点…"
                className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button onClick={addNote} className="px-4 bg-amber-500 text-white rounded-2xl text-xs font-bold">📝</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={tab === 'danmaku' ? '发弹幕…' : '跟大家打个招呼吧…'}
                className="w-full pl-4 pr-24 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => send()} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-[10px] font-bold">
                <Send size={11} /> {tab === 'danmaku' ? '弹幕' : '发送'}
              </button>
            </div>
          )}
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Users size={11} /> 1,284 人在线 · 28 人正在输入…</span>
            <div className="flex gap-2 text-slate-300">
              <MessageCircle size={14} /><Smile size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
