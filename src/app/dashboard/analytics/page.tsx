'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Download, AlertTriangle, Users, Award, Printer } from 'lucide-react';
import Link from 'next/link';
import { api, SUBJECT_LABEL, KP_STATUS, toCsv, downloadCsv } from '@/lib/client';
import { useUser } from '@/lib/user-context';

export default function AnalyticsPage() {
  const { user } = useUser();
  const [mastery, setMastery] = useState<any[]>([]);
  const [weak, setWeak] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [cls, setCls] = useState<any>(null);
  const [subject, setSubject] = useState('Math');

  useEffect(() => {
    api('/api/mastery').then((d) => { setMastery(d.mastery); setWeak(d.weak); setTrend(d.trend); }).catch(() => {});
  }, [user.id]);
  useEffect(() => {
    api(`/api/stats/class?subject=${subject}`).then(setCls).catch(() => {});
  }, [subject, user.id]);

  // 雷达图维度：取重要度最高的 6 个知识点
  const dims = [...mastery].sort((a, b) => b.importance - a.importance).slice(0, 6);
  const radarPts = (vals: number[]) =>
    vals.map((v, i) => {
      const angle = (i * 360) / vals.length - 90;
      const rad = (angle * Math.PI) / 180;
      return [100 + 78 * (v / 100) * Math.cos(rad), 100 + 78 * (v / 100) * Math.sin(rad)];
    });

  // 趋势折线（最近 30 天正确率，跳过 null 段）
  const validTrend = trend.filter((t) => t.rate != null);
  const linePts = validTrend
    .map((t, i) => [ (i / Math.max(1, validTrend.length - 1)) * 1000, 190 - (t.rate / 100) * 170 ] as [number, number])
    .map((p) => p.join(',')).join(' ');

  const exportReport = () => {
    const rows = [
      ['知识点', '学科', '掌握度(%)', '状态', '答题数', '真题出现率(%)'],
      ...mastery.map((m) => [m.name, SUBJECT_LABEL[m.subject], m.mastery, KP_STATUS[m.status].label, m.total, m.examFreq]),
    ];
    downloadCsv(`学情报告_${user.name}_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows[0], rows.slice(1)));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">成绩分析与学情诊断</h2>
          <p className="text-slate-500">基于答题数据 × 知识图谱的薄弱点定位与可视化报告</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Download size={14} /> 导出报告 CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Printer size={14} /> 打印 / 导出 PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 掌握度雷达图 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold mb-2">核心能力雷达图（掌握度）</h3>
          <div className="relative">
            <svg viewBox="0 0 200 200" className="w-full max-w-[260px] mx-auto">
              {[1, 0.75, 0.5, 0.25].map((s) => (
                <polygon
                  key={s}
                  points={dims.map((_, i) => {
                    const a = (i * 360) / dims.length - 90;
                    return `${100 + 78 * s * Math.cos((a * Math.PI) / 180)},${100 + 78 * s * Math.sin((a * Math.PI) / 180)}`;
                  }).join(' ')}
                  fill="none" stroke="#e2e8f0" strokeWidth="0.6"
                />
              ))}
              {dims.map((_, i) => {
                const a = (i * 360) / dims.length - 90;
                return <line key={i} x1="100" y1="100" x2={100 + 78 * Math.cos((a * Math.PI) / 180)} y2={100 + 78 * Math.sin((a * Math.PI) / 180)} stroke="#e2e8f0" strokeWidth="0.6" />;
              })}
              <polygon points={radarPts(dims.map((d) => d.mastery)).map((p) => p.join(',')).join(' ')} fill="rgba(79,145,99,0.2)" stroke="#4f9163" strokeWidth="2" />
              {dims.map((d, i) => {
                const [x, y] = radarPts(dims.map((x2) => x2.mastery))[i];
                return <circle key={d.kpId} cx={x} cy={y} r="3" fill={KP_STATUS[d.status].color} />;
              })}
            </svg>
            <div className="mt-3 space-y-1 max-w-[280px] mx-auto">
              {dims.map((d) => (
                <div key={d.kpId} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: KP_STATUS[d.status].color }} />
                    {d.name}
                  </span>
                  <span className="font-bold" style={{ color: KP_STATUS[d.status].color }}>{d.mastery}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 正确率趋势 */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold mb-4">近 30 天正确率曲线（自适应测评依据）</h3>
          <div className="flex-1 min-h-[240px] relative">
            <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-full">
              {[0, 25, 50, 75, 100].map((y) => (
                <line key={y} x1="0" y1={190 - (y / 100) * 170} x2="1000" y2={190 - (y / 100) * 170} stroke="#f1f5f9" strokeWidth="1" />
              ))}
              {validTrend.length > 1 && (
                <>
                  <polyline points={linePts} fill="none" stroke="#4f9163" strokeWidth="3" strokeLinecap="round" />
                  <polygon points={`0,190 ${linePts} 1000,190`} fill="url(#grad)" opacity="0.5" />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f9163" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#4f9163" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </>
              )}
            </svg>
            <div className="absolute top-0 right-0 text-[10px] text-slate-400 font-bold">100%</div>
            <div className="absolute bottom-0 right-0 text-[10px] text-slate-400 font-bold">0%</div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2">
            <span>{validTrend[0]?.label ?? '30 天前'}</span>
            <span>{validTrend[validTrend.length - 1]?.label ?? '今天'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 薄弱点 Top */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold mb-5 flex items-center gap-2"><AlertTriangle className="text-orange-500" size={17} /> 薄弱点定位 Top 5</h3>
          <div className="space-y-4">
            {weak.slice(0, 5).map((w, i) => (
              <div key={w.kpId}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700">
                    <span className="text-slate-300 mr-1.5">{i + 1}.</span>
                    {SUBJECT_LABEL[w.subject]}·{w.name}
                  </span>
                  <span className="text-[11px] font-black" style={{ color: KP_STATUS[w.status].color }}>{w.mastery}%</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w.mastery}%`, background: KP_STATUS[w.status].color }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">近期正确率 {w.lastCorrectRate}% · 真题率 {w.examFreq}%</p>
              </div>
            ))}
            {weak.length === 0 && <p className="text-sm text-slate-300">暂无薄弱点 🎉</p>}
          </div>
          <Link href="/dashboard/practice" className="mt-6 block text-center bg-orange-50 text-orange-600 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-100">
            去专项突破 →
          </Link>
        </div>

        {/* 学科掌握度 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold mb-5">学科掌握程度</h3>
          <div className="space-y-5">
            {mastery.map((m) => (
              <div key={m.kpId} className="flex items-center gap-3">
                <span className="w-24 text-[11px] font-bold text-slate-500 truncate">{m.name}</span>
                <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.mastery}%`, background: KP_STATUS[m.status].color }} />
                </div>
                <span className="w-9 text-right text-[11px] font-black" style={{ color: KP_STATUS[m.status].color }}>{m.mastery}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 班级对比 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold flex items-center gap-2"><Users className="text-blue-500" size={17} /> 班级对比</h3>
            <div className="flex gap-1">
              {['Math', 'English'].map((s) => (
                <button key={s} onClick={() => setSubject(s)} className={`px-3 py-1 rounded-lg text-[11px] font-bold ${subject === s ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                  {SUBJECT_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          {cls ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <div className="text-lg font-black">{cls.classAvg}</div>
                  <div className="text-[10px] text-slate-400 font-bold">班级均分</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <div className="text-lg font-black text-leaf-600">{cls.myRank > 0 ? `No.${cls.myRank}` : '—'}</div>
                  <div className="text-[10px] text-slate-400 font-bold">我的排名 / {cls.total} 人</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <div className="text-lg font-black flex items-center justify-center gap-1"><Award size={15} className="text-amber-500" />{cls.total}</div>
                  <div className="text-[10px] text-slate-400 font-bold">参考人数</div>
                </div>
              </div>
              <div className="space-y-2">
                {cls.students.slice(0, 8).map((s: any, i: number) => (
                  <div key={s.studentId} className={`flex items-center gap-3 p-2 rounded-xl ${s.studentId === user.id ? 'bg-leaf-50' : ''}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
                    <span className={`flex-1 text-xs font-bold ${s.studentId === user.id ? 'text-leaf-700' : 'text-slate-600'}`}>
                      {s.name} {s.studentId === user.id && '（我）'}
                    </span>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-leaf-500 rounded-full" style={{ width: `${s.avg}%` }} />
                    </div>
                    <span className="w-8 text-right text-[11px] font-black text-slate-600">{s.avg}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-300 text-center py-10">加载中…</p>
          )}
        </div>
      </div>
    </div>
  );
}
