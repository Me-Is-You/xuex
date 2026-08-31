'use client';

import React, { useState } from 'react';
import { 
  Trash2, 
  RefreshCcw, 
  Lightbulb, 
  ChevronRight,
  BrainCircuit,
  Filter
} from 'lucide-react';

const MOCK_ERRORS = [
  { id: 1, subject: '数学', kp: '二重积分', content: '求 ∫∫_D (x+y) dxdy，其中 D 是由...', date: '2026-05-20', times: 3 },
  { id: 2, subject: '英语', kp: '虚拟语气', content: 'If I ___ you, I would have taken the offer.', date: '2026-05-18', times: 1 },
  { id: 3, subject: '数学', kp: '矩阵的秩', content: '已知矩阵 A 的秩为 2，求参数 k...', date: '2026-05-15', times: 2 },
];

export default function ErrorBookPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">智能错题本</h2>
          <p className="text-slate-500">AI 自动归集与薄弱点深度诊断</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200">
          <RefreshCcw size={18} /> AI 相似题推荐
        </button>
      </div>

      {/* AI Diagnosis Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 rounded-3xl text-white flex flex-col md:flex-row items-center gap-8">
        <div className="bg-white/10 p-4 rounded-full backdrop-blur-md">
          <BrainCircuit size={48} className="text-emerald-100" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">AI 诊断报告：本周薄弱项</h3>
          <p className="text-emerald-50 text-sm mb-4">
            你在“空间向量”部分的平均答题时间比全国水平慢 40%，且正确率仅为 35%。建议重新观看《向量代数精讲》第 3 节。
          </p>
          <div className="flex gap-4">
            <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold">建议复习时长：2h</span>
            <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold">关联真题：15道</span>
          </div>
        </div>
        <button className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap">开始强化训练</button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 mr-4">
          <Filter size={16} /> <span className="text-sm font-bold">筛选</span>
        </div>
        <select className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none">
          <option>全部科目</option>
          <option>数学</option>
          <option>英语</option>
        </select>
        <select className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none">
          <option>按时间降序</option>
          <option>按错误频率</option>
        </select>
      </div>

      {/* Error List */}
      <div className="space-y-4">
        {MOCK_ERRORS.map((error) => (
          <div key={error.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${error.subject === '数学' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {error.subject}
                </span>
                <span className="text-sm font-bold text-slate-800">{error.kp}</span>
                <span className="text-[10px] text-slate-400">错误次数：{error.times}次</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium uppercase">{error.date}</div>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 line-clamp-2 leading-relaxed italic">
              “{error.content}”
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <Lightbulb size={14} /> 查看解析
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <RefreshCcw size={14} /> 重新挑战
                </button>
              </div>
              <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
