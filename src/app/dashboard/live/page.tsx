'use client';

import React, { useState } from 'react';
import { 
  Play, 
  Users, 
  MessageCircle, 
  Hand, 
  MoreVertical, 
  Share2, 
  Heart,
  BarChart2,
  Smile,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LivePage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    { id: 1, user: '李华', text: '老师，洛必达法则的适用前提能不能再讲一下？', time: '10:05' },
    { id: 2, user: '张伟', text: '这道题我算出来的结果是 1/2', time: '10:06' },
    { id: 3, user: '王芳', text: '666，这个技巧太牛了！', time: '10:07' },
  ]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
      {/* Left: Video & Teacher Info */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="aspect-video bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl group">
          {/* Mock Video Stream */}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-center">
               <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                 <Play className="text-blue-500 w-10 h-10" fill="currentColor" />
               </div>
               <p className="text-white/60 text-sm font-medium">正在连接 2027 届高数直播间...</p>
             </div>
          </div>
          
          {/* Live Overlays */}
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full" /> 直播中
            </div>
            <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <Users size={14} /> 1,284 观看
            </div>
          </div>

          <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="bg-white/10 backdrop-blur-md text-white p-3 rounded-xl hover:bg-white/20 transition-colors">
              <Heart size={20} />
            </button>
            <button className="bg-white/10 backdrop-blur-md text-white p-3 rounded-xl hover:bg-white/20 transition-colors">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-start">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">2027 专升本高数：一元函数积分学深度攻克</h2>
            <div className="flex items-center gap-4 text-slate-500 text-sm">
              <span className="flex items-center gap-1.5 font-medium"><div className="w-2 h-2 rounded-full bg-blue-500" /> 高等数学</span>
              <span>主讲：张教授 (博士生导师)</span>
              <span>课程代码：MATH-2027-04</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200">
              <Hand size={18} /> 申请连麦
            </button>
          </div>
        </div>

        {/* Polling Mock */}
        <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-3xl border border-blue-100 flex items-center gap-6">
          <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0">
            <BarChart2 size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-800 mb-1">随堂互动：这道极限题你应该选择哪种方法？</h4>
            <div className="flex gap-4">
              <button className="text-[11px] font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition-all">A. 洛必达法则</button>
              <button className="text-[11px] font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition-all">B. 等价无穷小</button>
              <button className="text-[11px] font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition-all">C. 泰勒公式</button>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase">剩余时间</span>
            <div className="text-xl font-black text-blue-600">00:45</div>
          </div>
        </div>
      </div>

      {/* Right: Interaction Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-50">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400'}`}
          >
            互动聊天
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'notes' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400'}`}
          >
            我的笔记
          </button>
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'ranking' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400'}`}
          >
            活跃榜
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {activeTab === 'chat' && messages.map((m) => (
            <div key={m.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{m.user[0]}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-900">{m.user}</span>
                  <span className="text-[9px] text-slate-400 uppercase">{m.time}</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100/50">
                  {m.text}
                </div>
              </div>
            </div>
          ))}
          {activeTab === 'notes' && (
            <div className="text-center py-20 text-slate-400">
              <Zap size={32} className="mx-auto mb-4 opacity-20" />
              <p className="text-xs">还没有笔记？点击视频截图自动保存笔记。</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-50">
          <div className="relative">
            <input 
              type="text" 
              placeholder="跟大家打个招呼吧..." 
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
              <Smile size={18} />
            </button>
          </div>
          <div className="mt-3 flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Users size={12} /> 28 人正在输入...
            </span>
            <div className="flex gap-2">
              <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><MessageCircle size={16} /></button>
              <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><MoreVertical size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
