'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Zap, Clock, CheckCircle2, ChevronRight, TrendingUp, BookMarked, Flame,
  Target, AlertTriangle, Sparkles, ArrowRight,
} from 'lucide-react';
import { api, SUBJECT_LABEL, fmtDateTime } from '@/lib/client';
import { useUser } from '@/lib/user-context';

export default function Dashboard() {
  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [goal, setGoal] = useState<any>(null);
  const [weak, setWeak] = useState<any[]>([]);
  const [hours] = useState(() => {
    const h = new Date().getHours();
    return h < 6 ? '夜深了' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好';
  });

  useEffect(() => {
    api('/api/stats/overview').then(setData).catch(() => {});
    api('/api/recommend?count=4').then(setRecs).catch(() => {});
    api('/api/goals').then((rows: any[]) => setGoal(rows.find((g) => g.status === 'active') ?? rows[0] ?? null)).catch(() => {});
    api('/api/mastery').then((d) => setWeak(d.weak.slice(0, 3))).catch(() => {});
  }, [user.id]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-leaf-600" />
      </div>
    );
  }

  const g = data.dailyGoal;
  const totalTarget = g ? g.mathTarget + g.englishTarget : 0;
  const totalDone = g ? g.mathCompleted + g.englishCompleted : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 欢迎 & 倒计时 & 连胜 */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-gradient-to-br from-leaf-600 to-leaf-700 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">
              {hours}，{user.name}！
            </h2>
            <p className="text-leaf-50 mb-6 max-w-md">
              距离 2027 年陕西专升本考试还有 <span className="font-bold text-white">{data.examDays}</span> 天。
              你的学习计划已按画像与掌握度智能生成。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/practice"
                className="inline-flex items-center gap-2 bg-white text-leaf-600 px-6 py-3 rounded-xl font-bold hover:bg-leaf-50 transition-colors"
              >
                开始今日练习 <Zap className="w-4 h-4" />
              </Link>
              {weak.length > 0 && (
                <Link
                  href="/dashboard/analytics"
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-5 py-3 rounded-xl font-bold hover:bg-white/25 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" /> 查看薄弱点诊断
                </Link>
              )}
            </div>
          </div>
          <Zap className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10" />
        </div>

        <div className="w-full md:w-72 bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-500 uppercase">学习连胜</span>
            <Flame className="text-orange-500" />
          </div>
          <div className="text-center py-4">
            <span className="text-6xl font-black text-slate-900">{data.streak}</span>
            <span className="text-slate-500 font-medium ml-2">天</span>
          </div>
          <p className="text-[11px] text-slate-400 text-center">连续 {data.streak} 天保持学习，别断更！</p>
        </div>
      </section>

      {/* 统计卡片（真实数据） */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard icon={<BookMarked className="text-blue-600" />} label="已掌握知识点" value={`${data.masteredCount}/${data.totalKnowledge}`} trend={`${data.weakCount} 个薄弱待攻克`} />
        <StatCard icon={<Clock className="text-indigo-600" />} label="近 7 天学习时长" value={`${data.totalMinutes}m`} trend={g ? `今日目标 ${totalTarget} 题` : ''} />
        <StatCard icon={<CheckCircle2 className="text-leaf-600" />} label="近 30 天正确率" value={`${data.accuracy}%`} trend={data.accuracy >= 70 ? '状态良好' : '需加强'} />
        <StatCard icon={<Target className="text-orange-500" />} label="学习目标进度" value={goal ? `${goal.progress}%` : '未设定'} trend={goal ? goal.title.slice(0, 8) : '去设定 →'} href={goal ? undefined : '/dashboard/goals'} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 今日任务（目标自动拆解） */}
        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">今日任务清单</h3>
            <Link href="/dashboard/goals" className="text-xs font-bold text-leaf-600 flex items-center gap-1">
              管理目标 <ChevronRight size={12} />
            </Link>
          </div>
          {g ? (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">
                    数学 {g.mathCompleted}/{g.mathTarget} · 英语 {g.englishCompleted}/{g.englishTarget}
                  </span>
                  <span className="text-leaf-600">{Math.round((totalDone / Math.max(1, totalTarget)) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-leaf-500 to-leaf-700 rounded-full transition-all duration-700" style={{ width: `${(totalDone / Math.max(1, totalTarget)) * 100}%` }} />
                </div>
              </div>
              {goal?.breakdown?.[0] && (
                <div className="p-4 bg-leaf-50/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-leaf-700 mb-2">
                    当前阶段：{goal.breakdown[0].phase}（{goal.breakdown[0].range}）
                  </div>
                  <ul className="space-y-1.5">
                    {goal.breakdown[0].tasks.slice(0, 3).map((t: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 size={13} className="text-leaf-500 shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">尚未设定每日目标，去「学习目标」创建吧。</p>
          )}
        </section>

        {/* 智能推题（AI 推荐引擎） */}
        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-amber-500" /> 智能推题
            </h3>
            <span className="text-[10px] font-bold text-slate-400">基于画像 + 协同过滤 + 薄弱定向</span>
          </div>
          <div className="space-y-3">
            {recs.length === 0 && <p className="text-sm text-slate-400">暂无推荐题目。</p>}
            {recs.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/practice?focus=${r.id}`}
                className="group block p-4 rounded-2xl border border-slate-50 hover:border-leaf-100 hover:bg-leaf-50/30 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.subject === 'Math' ? 'bg-leaf-100 text-leaf-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {SUBJECT_LABEL[r.subject]} · 难度 {r.difficulty}
                  </span>
                  <span className="text-[10px] text-slate-400">推荐分 {r.score}</span>
                </div>
                <p className="text-[13px] font-medium text-slate-700 line-clamp-2">{r.content}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.reasons.slice(0, 3).map((reason: string, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded">
                      {reason}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* 薄弱点提醒 */}
      {weak.length > 0 && (
        <section className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-orange-500" size={18} />
            <h3 className="font-bold text-slate-800">本周薄弱点提醒（知识图谱匹配）</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weak.map((w) => (
              <Link key={w.kpId} href="/dashboard/practice" className="p-4 rounded-2xl bg-orange-50/50 hover:bg-orange-50 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">{SUBJECT_LABEL[w.subject]}·{w.name}</span>
                  <span className="text-[10px] font-black text-orange-600">{w.mastery}%</span>
                </div>
                <div className="h-1.5 bg-white rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${w.mastery}%` }} />
                </div>
                <span className="text-[10px] text-slate-400">真题出现率 {w.examFreq}% · 建议今日专练 10 题</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, trend, href }: { icon: React.ReactNode; label: string; value: string; trend: string; href?: string }) {
  const body = (
    <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 bg-leaf-50 rounded-xl">{icon}</div>
        <span className="text-xs md:text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl md:text-3xl font-bold text-slate-900">{value}</span>
        {trend && <span className="text-[10px] font-semibold text-leaf-600 bg-leaf-50 px-2 py-0.5 rounded-lg">{trend}</span>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="hover:opacity-90 transition-opacity">{body}</Link> : body;
}
