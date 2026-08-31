'use client';

import React, { useEffect, useState } from 'react';
import { Target, Plus, CalendarDays, Trophy, Pause, Play, CheckCircle2, X } from 'lucide-react';
import { api, SUBJECT_LABEL } from '@/lib/client';
import { useUser } from '@/lib/user-context';

export default function GoalsPage() {
  const { user } = useUser();
  const [goals, setGoals] = useState<any[]>([]);
  const [now, setNow] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', targetScore: 120, deadline: '2027-03-20', subject: 'Math' });
  const [notice, setNotice] = useState('');

  const load = () =>
    api('/api/goals')
      .then((d: any) => { setGoals(d.goals ?? []); setNow(d.now ?? 0); })
      .catch(() => {});
  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    if (!form.title.trim() || !form.deadline) return;
    await api('/api/goals', { method: 'POST', body: form }).catch((e) => setNotice(e.message));
    setForm({ title: '', targetScore: 120, deadline: '2027-03-20', subject: 'Math' });
    setShowForm(false); setNotice('');
    load();
  };

  const toggle = async (g: any) => {
    // 状态流转：active ↔ paused（完成可手动标记 completed）
    const next = g.status === 'active' ? 'paused' : g.status === 'paused' ? 'active' : 'completed';
    await api(`/api/goals/${g.id}`, { method: 'PATCH', body: { status: next } }).catch((e) => setNotice(e.message));
    load();
  };

  const daysLeft = (d: string) => Math.max(0, Math.round((new Date(d).getTime() - now) / 86400000));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3"><Target className="text-leaf-600" /> 学习目标</h2>
          <p className="text-slate-500 text-sm mt-1">设定目标 → 系统按截止日期自动拆解为「基础 / 强化 / 冲刺」阶段任务</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 bg-leaf-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-leaf-700">
          <Plus size={15} /> 设定新目标
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-leaf-100 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">目标描述</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：2027 数学目标 120 分" className="w-full mt-1.5 p-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-leaf-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">目标分数</label>
              <input type="number" value={form.targetScore} onChange={(e) => setForm({ ...form, targetScore: Number(e.target.value) })} className="w-full mt-1.5 p-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">学科</label>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full mt-1.5 p-3 bg-slate-50 rounded-xl text-sm border border-slate-100">
                <option value="Math">数学</option>
                <option value="English">英语</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><CalendarDays size={11} /> 截止日期（考试日期前）</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full mt-1.5 p-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-leaf-500" />
            </div>
          </div>
          {notice && <p className="text-xs font-bold text-red-500 mt-3">{notice}</p>}
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-400">取消</button>
            <button onClick={create} className="px-5 py-2 bg-leaf-600 text-white text-xs font-bold rounded-xl hover:bg-leaf-700">
              创建并自动拆解
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {goals.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-300 text-sm">
            还没有学习目标。设定一个目标，系统会自动拆解阶段任务。
          </div>
        )}
        {goals.map((g) => (
          <div key={g.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-wrap items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${g.status === 'active' ? 'bg-leaf-50 text-leaf-600' : 'bg-slate-50 text-slate-400'}`}>
                <Trophy size={22} />
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800">{g.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.status === 'active' ? 'bg-leaf-50 text-leaf-600' : 'bg-slate-100 text-slate-400'}`}>
                    {g.status === 'active' ? '进行中' : g.status === 'paused' ? '已暂停' : '已完成'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-3">
                  <span>{SUBJECT_LABEL[g.title.includes('数学') || g.title.includes('Math') ? 'Math' : 'English']}</span>
                  <span>目标 {g.targetScore ?? '-'} 分</span>
                  <span>截止 {g.deadline}（剩 {daysLeft(g.deadline)} 天）</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-leaf-600">{g.progress}%</div>
                  <div className="text-[10px] text-slate-400 font-bold">总体进度</div>
                </div>
                <button onClick={() => toggle(g)} className="p-2.5 bg-slate-50 rounded-xl text-slate-500 hover:bg-slate-100" title={g.status === 'active' ? '暂停' : '恢复'}>
                  {g.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-leaf-500 to-leaf-700 rounded-full" style={{ width: `${g.progress}%` }} />
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(g.breakdown ?? []).map((phase: any, i: number) => (
                <div key={i} className={`p-4 rounded-2xl border ${i === 0 ? 'border-leaf-200 bg-leaf-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-black ${i === 0 ? 'text-leaf-700' : 'text-slate-500'}`}>
                      {i === 0 && '▶ '}{phase.phase}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{phase.range}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {phase.tasks.map((t: string, j: number) => (
                      <li key={j} className="flex items-start gap-2 text-[11px] text-slate-600 leading-snug">
                        <CheckCircle2 size={12} className={`mt-0.5 shrink-0 ${i === 0 ? 'text-leaf-500' : 'text-slate-300'}`} /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
