import React from 'react';
import { 
  BarChart3, 
  LineChart, 
  PieChart,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">成绩分析与预测</h2>
          <p className="text-slate-500">基于大数据驱动的 2027 届录取概率分析</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
          <span className="text-sm font-bold">录取概率预测:</span>
          <span className="text-xl font-black">78.5%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Subject Strength - Radar Chart (SVG) */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6">核心能力雷达图</h3>
          <div className="flex-1 flex items-center justify-center relative">
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-[240px]">
              {/* Radar Background */}
              {[1, 0.8, 0.6, 0.4, 0.2].map((scale) => (
                <polygon
                  key={scale}
                  points={Array.from({ length: 6 }).map((_, i) => {
                    const angle = (i * 60 * Math.PI) / 180;
                    return `${100 + 80 * scale * Math.sin(angle)},${100 - 80 * scale * Math.cos(angle)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                />
              ))}
              {/* Axes */}
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i * 60 * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1="100" y1="100"
                    x2={100 + 80 * Math.sin(angle)} y2={100 - 80 * Math.cos(angle)}
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                  />
                );
              })}
              {/* Data Shape */}
              <polygon
                points={
                  [[0.8, 60], [0.7, 120], [0.9, 180], [0.5, 240], [0.6, 300], [0.85, 0]].map(([val, angle]) => {
                    const a = (angle * Math.PI) / 180;
                    return `${100 + 80 * val * Math.sin(a)},${100 - 80 * val * Math.cos(a)}`;
                  }).join(' ')
                }
                fill="rgba(16, 185, 129, 0.2)"
                stroke="#10b981"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute top-0 text-[9px] font-bold text-slate-400">高数基础</div>
            <div className="absolute top-1/4 -right-2 text-[9px] font-bold text-slate-400">词汇记忆</div>
            <div className="absolute bottom-1/4 -right-2 text-[9px] font-bold text-slate-400">阅读理解</div>
            <div className="absolute bottom-0 text-[9px] font-bold text-slate-400">矩阵变换</div>
            <div className="absolute bottom-1/4 -left-2 text-[9px] font-bold text-slate-400">导数应用</div>
            <div className="absolute top-1/4 -left-2 text-[9px] font-bold text-slate-400">写作表达</div>
          </div>
          <div className="mt-6 p-4 bg-slate-50 rounded-2xl text-[10px] text-slate-500 leading-relaxed">
            <span className="font-bold text-blue-600 block mb-1">能力分析：</span>
            你的“高数基础”表现优异，但在“阅读理解”中存在耗时过长的趋势，建议强化提分练习。
          </div>
        </div>

        {/* Subject Strength Bar Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">学科掌握程度分布</h3>
            <button className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline">
              <TrendingUp size={14} /> 查看各校录取线对比
            </button>
          </div>
          <div className="h-80 w-full flex items-end gap-4">
             {/* Mock Chart using CSS as I don't want to install recharts unless necessary, but I'll use placeholders */}
             <div className="flex-1 flex flex-col justify-end gap-2 group">
                <div className="text-center text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">85%</div>
                <div className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500 hover:bg-emerald-600" style={{ height: '85%' }}></div>
                <div className="text-center text-xs font-semibold text-slate-600 mt-2">高数-微积分</div>
             </div>
             <div className="flex-1 flex flex-col justify-end gap-2 group">
                <div className="text-center text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">62%</div>
                <div className="w-full bg-emerald-400 rounded-t-lg transition-all duration-500 hover:bg-emerald-600" style={{ height: '62%' }}></div>
                <div className="text-center text-xs font-semibold text-slate-600 mt-2">高数-线性代数</div>
             </div>
             <div className="flex-1 flex flex-col justify-end gap-2 group">
                <div className="text-center text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">92%</div>
                <div className="w-full bg-teal-500 rounded-t-lg transition-all duration-500 hover:bg-teal-600" style={{ height: '92%' }}></div>
                <div className="text-center text-xs font-semibold text-slate-600 mt-2">英语-语法</div>
             </div>
             <div className="flex-1 flex flex-col justify-end gap-2 group">
                <div className="text-center text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">45%</div>
                <div className="w-full bg-teal-400 rounded-t-lg transition-all duration-500 hover:bg-teal-600" style={{ height: '45%' }}></div>
                <div className="text-center text-xs font-semibold text-slate-600 mt-2">英语-写作</div>
             </div>
             <div className="flex-1 flex flex-col justify-end gap-2 group">
                <div className="text-center text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">70%</div>
                <div className="w-full bg-slate-400 rounded-t-lg transition-all duration-500 hover:bg-slate-500" style={{ height: '70%' }}></div>
                <div className="text-center text-xs font-semibold text-slate-600 mt-2">平均水平</div>
             </div>
          </div>
        </div>

        {/* Weaknesses */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">薄弱环节 Top 3</h3>
          <div className="space-y-6">
            <WeaknessItem 
              label="英语：从句结构" 
              desc="近期正确率下降 15%，建议加强练习。" 
              color="bg-red-500"
            />
            <WeaknessItem 
              label="数学：二重积分" 
              desc="解题耗时过长，平均每题 12 分钟。" 
              color="bg-orange-500"
            />
            <WeaknessItem 
              label="数学：空间向量" 
              desc="核心知识点遗忘，建议重读第 8 章节。" 
              color="bg-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* Progress Over Time */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold mb-6">学习力曲线</h3>
        <div className="h-64 w-full relative">
          {/* Simple SVG Line Chart */}
          <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <path 
              d="M0,180 C100,170 200,140 300,150 C400,160 500,100 600,110 C700,120 800,50 900,60 L1000,40" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path 
              d="M0,180 C100,170 200,140 300,150 C400,160 500,100 600,110 C700,120 800,50 900,60 L1000,40 V200 H0 Z" 
              fill="url(#gradient)" 
              opacity="0.1"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex justify-between items-end px-2 pointer-events-none">
            {['1月', '2月', '3月', '4月', '5月', '6月', '7月'].map(month => (
              <span key={month} className="text-[10px] text-slate-400 font-bold uppercase">{month}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeaknessItem({ label, desc, color }: { label: string, desc: string, color: string }) {
  return (
    <div className="flex gap-4">
      <div className={`w-1 shrink-0 rounded-full ${color}`}></div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">{label}</h4>
        <p className="text-xs text-slate-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}
