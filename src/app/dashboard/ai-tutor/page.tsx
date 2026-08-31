'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Paperclip, 
  Mic, 
  BrainCircuit,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  id: number;
  role: 'assistant' | 'user';
  content: string;
  type?: 'text' | 'card';
  data?: any;
};

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', content: '你好！我是你的 2027 届专升本智能助教。针对大数据技术方向的高数与英语，你可以随时向我提问，或者让我为你批改作文。' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // 模拟 AI 意图识别与回复
    setTimeout(() => {
      let aiContent = "正在为你分析该问题...";
      if (input.includes('极限')) {
        aiContent = "关于极限的计算，核心在于识别型式（如 0/0, ∞/∞）。建议优先考虑洛必达法则或等价无穷小替换。需要我为你推送几道相关的练习题吗？";
      } else if (input.includes('作文')) {
        aiContent = "已开启智能批改模式。请发送你的英语作文片段，我会从语法、词汇高级感及逻辑连贯性三个维度为你打分并修改。";
      }

      const aiMsg: Message = { id: Date.now() + 1, role: 'assistant', content: aiContent };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col max-w-5xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
      {/* AI Header */}
      <div className="px-6 py-4 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI 智能助教 Pro</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">7x24 在线诊断中</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-white border border-emerald-100 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-emerald-50 transition-colors">清除对话</button>
          <button className="px-3 py-1.5 bg-white border border-emerald-100 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-emerald-50 transition-colors">导出记录</button>
        </div>
      </div>

      {/* Chat Canvas */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-50/30">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-blue-600 border border-slate-100'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 rounded-tr-none' 
                    : 'bg-white text-slate-700 shadow-sm border border-emerald-50 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-blue-600">
                <Bot size={16} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-50">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {['如何备考高数？', '批改英语作文', '今日大数据方向重点', '生成极限练习题'].map((chip) => (
            <button 
              key={chip}
              onClick={() => setInput(chip)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 text-[11px] font-bold rounded-full border border-slate-100 transition-all whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="描述你的问题或粘贴题目内容..."
            className="w-full pl-4 pr-32 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Mic size={20} />
            </button>
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Paperclip size={20} />
            </button>
            <button 
              onClick={handleSend}
              className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1">
          <Sparkles size={10} className="text-amber-400" /> AI 助手正在分析你的学习历史，回答内容将基于 2027 最新考纲
        </p>
      </div>
    </div>
  );
}
