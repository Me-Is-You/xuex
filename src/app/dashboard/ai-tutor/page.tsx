'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BrainCircuit, ClipboardCheck, MessageSquare, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { api, SUBJECT_LABEL } from '@/lib/client';
import { useUser } from '@/lib/user-context';

type Msg = { id: number; role: 'assistant' | 'user'; content: string; intent?: string; cards?: any[] };

const INTENT_LABEL: Record<string, string> = {
  solve: '解题答疑', practice: '出题练习', grade: '智能批改', plan: '学习规划',
  diagnosis: '薄弱诊断', resource: '资源推荐', encourage: '学习激励', chitchat: '闲聊',
};

export default function AITutorPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<'chat' | 'grade'>('chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 批改状态
  const [gradeType, setGradeType] = useState<'objective' | 'subjective'>('subjective');
  const [allQs, setAllQs] = useState<any[]>([]);
  const [gQuestionId, setGQuestionId] = useState<number | null>(null);
  const [gAnswer, setGAnswer] = useState('');
  const [essay, setEssay] = useState('');
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    api('/api/ai/chat').then((rows: any[]) => {
      setMessages(
        rows.map((r) => ({ id: r.id, role: r.role as 'user' | 'assistant', content: r.content, intent: r.intent })),
      );
    }).catch(() => {}).finally(() => setLoading(false));
    api('/api/questions?limit=100').then(setAllQs).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setMessages((m) => [...m, { id: Date.now(), role: 'user', content: msg }]);
    setInput('');
    setTyping(true);
    try {
      const res = await api<{ reply: string; intent: string; suggestions: string[]; cards?: any[] }>('/api/ai/chat', {
        method: 'POST',
        body: { message: msg },
      });
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: 'assistant', content: res.reply, intent: res.intent, cards: res.cards },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', content: '网络异常：' + e.message }]);
    } finally {
      setTyping(false);
    }
  };

  const clear = async () => {
    setMessages([]);
    // 演示环境：仅清空本地视图
  };

  const submitGrade = async () => {
    setGrading(true);
    setGradeResult(null);
    try {
      if (gradeType === 'objective') {
        if (!gQuestionId || !gAnswer) { setGradeResult({ error: '请选择题目并填写你的答案' }); return; }
        const res = await api<any>('/api/ai/grade', { method: 'POST', body: { type: 'objective', questionId: gQuestionId, userAnswer: gAnswer } });
        setGradeResult(res);
      } else {
        if (!essay.trim()) { setGradeResult({ error: '请粘贴作文内容' }); return; }
        const res = await api<any>('/api/ai/grade', { method: 'POST', body: { type: 'subjective', essay } });
        setGradeResult(res);
      }
    } catch (e: any) {
      setGradeResult({ error: e.message });
    } finally {
      setGrading(false);
    }
  };

  const gq = allQs.find((q) => q.id === gQuestionId);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-170px)] flex flex-col">
      {/* Tab */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('chat')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${tab === 'chat' ? 'bg-leaf-600 text-white shadow-lg shadow-leaf-100' : 'bg-white text-slate-500 border border-slate-100'}`}>
          <MessageSquare size={15} /> AI 对话答疑
        </button>
        <button onClick={() => setTab('grade')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${tab === 'grade' ? 'bg-leaf-600 text-white shadow-lg shadow-leaf-100' : 'bg-white text-slate-500 border border-slate-100'}`}>
          <ClipboardCheck size={15} /> 智能批改
        </button>
      </div>

      {tab === 'chat' ? (
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden min-h-0">
          <div className="px-6 py-3.5 border-b border-leaf-50 flex items-center justify-between bg-leaf-50/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-leaf-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-leaf-200">
                <BrainCircuit size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold">AI 智能助教 Pro</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-leaf-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400">7×24 在线 · NLU 意图识别 · 多轮上下文</span>
                </div>
              </div>
            </div>
            <button onClick={clear} className="p-2 text-slate-400 hover:text-red-400" title="清空对话">
              <Trash2 size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/40 min-h-0">
            {loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-leaf-600" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                你好 {user.name}！我是你的智能助教。<br />试试问我：「二重积分老是算错怎么办？」
              </div>
            ) : (
              messages.map((msg) => {
                const card = msg.cards?.[0];
                return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-leaf-600 text-white'}`}>
                      {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div>
                      {msg.intent && msg.role === 'assistant' && (
                        <span className="inline-block text-[9px] font-black text-leaf-600 bg-leaf-50 px-2 py-0.5 rounded-full mb-1">
                          意图：{INTENT_LABEL[msg.intent] ?? msg.intent}
                        </span>
                      )}
                      <div className={`p-3.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-leaf-600 text-white rounded-tr-none' : 'bg-white text-slate-700 shadow-sm border border-slate-50 rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                      {card && (
                        <div className="mt-2 p-3 bg-white border border-leaf-100 rounded-2xl">
                          <div className="text-[10px] font-bold text-slate-400 mb-2">✨ {card.label}</div>
                          {card.items?.map((it: string, i: number) => (
                            <Link key={i} href={card.href ?? '/dashboard'} className="block text-xs text-slate-600 hover:text-leaf-600 py-1">· {it}</Link>
                          ))}
                        </div>
                      )}
                      {msg.id === lastAssistantId(messages) && !typing && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {suggestionsFor(messages).map((s, i) => (
                            <button key={i} onClick={() => send(s)} className="text-[11px] font-bold px-3 py-1.5 bg-white border border-leaf-100 text-leaf-600 rounded-full hover:bg-leaf-50">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
                );
              })
            )}
            {typing && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-leaf-600 text-white flex items-center justify-center"><Bot size={14} /></div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-50">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {['二重积分老是算错怎么办？', '帮我诊断薄弱点', '出 2 道二重积分练习', '高数怎么备考？', '批改英语作文'].map((chip) => (
                <button key={chip} onClick={() => send(chip)} className="px-3 py-1.5 bg-slate-50 hover:bg-leaf-50 hover:text-leaf-600 text-slate-500 text-[11px] font-bold rounded-full border border-slate-100 whitespace-nowrap">
                  {chip}
                </button>
              ))}
            </div>
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="描述你的问题，或粘贴题目内容…"
                className="w-full pl-4 pr-14 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 resize-none h-16"
              />
              <button onClick={() => send()} className="absolute right-3 bottom-3 bg-leaf-600 text-white p-2.5 rounded-xl shadow-lg shadow-leaf-200 hover:bg-leaf-700">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* 批改提交 */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-y-auto">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><ClipboardCheck className="text-leaf-600" /> 智能批改</h3>
            <p className="text-xs text-slate-400 mb-5">客观题自动判分讲解 · 主观题（作文）四维度评分与逐句修改</p>
            <div className="flex gap-2 mb-5">
              <button onClick={() => { setGradeType('subjective'); setGradeResult(null); }} className={`px-4 py-2 rounded-xl text-xs font-bold ${gradeType === 'subjective' ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                英语作文（主观题）
              </button>
              <button onClick={() => { setGradeType('objective'); setGradeResult(null); }} className={`px-4 py-2 rounded-xl text-xs font-bold ${gradeType === 'objective' ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                客观题判分
              </button>
            </div>
            {gradeType === 'subjective' ? (
              <textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={'Paste your essay here…\n建议 80 词以上。示例：I am writing to inform you that...'}
                className="w-full h-48 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
              />
            ) : (
              <div className="space-y-4">
                <select value={gQuestionId ?? ''} onChange={(e) => { setGQuestionId(Number(e.target.value)); setGAnswer(''); }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none">
                  <option value="">选择题目…</option>
                  {allQs.map((q) => (
                    <option key={q.id} value={q.id}>[{SUBJECT_LABEL[q.subject]}·{q.category}] {q.content.slice(0, 40)}…</option>
                  ))}
                </select>
                {gq && (
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-sm font-medium mb-3 whitespace-pre-line">{gq.content}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {gq.options.map((o: string, i: number) => (
                        <button key={i} onClick={() => setGAnswer(o)} className={`text-left p-2.5 rounded-xl border text-xs font-medium ${gAnswer === o ? 'border-leaf-500 bg-leaf-50 text-leaf-700' : 'border-slate-100 text-slate-600'}`}>
                          {String.fromCharCode(65 + i)}. {o}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={submitGrade} disabled={grading} className="mt-5 w-full bg-leaf-600 text-white py-3.5 rounded-2xl font-bold hover:bg-leaf-700 disabled:opacity-50 transition-all">
              {grading ? '批改中…' : '开始批改'}
            </button>
          </div>

          {/* 批改结果 */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">批改结果</h3>
            {!gradeResult ? (
              <div className="text-center py-20 text-slate-300">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">提交内容后查看批改意见与改进建议</p>
              </div>
            ) : gradeResult.error ? (
              <p className="text-sm font-bold text-red-500">{gradeResult.error}</p>
            ) : (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl ${gradeResult.score == null ? 'bg-slate-50' : gradeResult.score >= 70 ? 'bg-leaf-50' : 'bg-orange-50'}`}>
                  <div className="text-xs font-bold text-slate-500 mb-1">{gradeResult.type === 'subjective' ? '综合评分' : '判定'}</div>
                  <div className="flex items-baseline gap-3">
                    {gradeResult.score != null && <span className="text-4xl font-black">{gradeResult.score}<span className="text-sm text-slate-400 font-bold">/100</span></span>}
                    <span className="font-bold text-sm">{gradeResult.verdict}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {gradeResult.feedback.map((f: string, i: number) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed">{f}</div>
                  ))}
                </div>
                {gradeResult.improved && gradeResult.improved !== essay && (
                  <div className="p-4 border border-dashed border-leaf-200 rounded-2xl bg-leaf-50/30">
                    <div className="text-xs font-bold text-leaf-700 mb-2">✍️ 修改后版本</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{gradeResult.improved}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function lastAssistantId(messages: Msg[]): number | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') return messages[i].id;
  }
  return null;
}
function suggestionsFor(messages: Msg[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].cards) return ['继续', '详细展开'];
  }
  return [];
}
