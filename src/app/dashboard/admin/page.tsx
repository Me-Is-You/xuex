'use client';

import React from 'react';
import { 
  Users, 
  BarChart, 
  AlertTriangle, 
  MessageCircle,
  TrendingUp,
  Download,
  Calendar,
  MoreHorizontal
} from 'lucide-react';

export default function TeachingAdminPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">教学管理中心</h2>
          <p className="text-slate-500 text-sm">大数据实时监控与学情干预系统</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            <Download size={16} /> 导出报表
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200">
            发布全员通知
          </button>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatItem label="活跃学员" value="1,284" trend="+12%" icon={<Users className="text-blue-600" />} />
        <StatItem label="平均正确率" value="76.8%" trend="+2.4%" icon={<BarChart className="text-indigo-600" />} />
        <StatItem label="学情预警" value="15" trend="需干预" icon={<AlertTriangle className="text-orange-600" />} color="text-orange-600" />
        <StatItem label="答疑请求" value="42" trend="未回复" icon={<MessageCircle className="text-emerald-600" />} color="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exam Management Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                智能考务与自动组卷
              </h3>
              <button className="text-xs font-bold text-blue-600">新建试卷</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">2027 届第一次模考</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded">已发布</span>
                  </div>
                  <h4 className="text-sm font-bold mb-4">高等数学全真模拟 (A卷)</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>参与人数: 1,420</span>
                    <span>防作弊状态: 开启</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">专项突击</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">智能组卷中</span>
                  </div>
                  <h4 className="text-sm font-bold mb-4">英语长难句专项测评</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>配置: 随机抽题</span>
                    <span>难度: 3.5/5.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                高风险学员预警 (异常识别)
              </h3>
              <span className="text-xs text-slate-400">基于近 7 天学习行为</span>
            </div>
            <div className="divide-y divide-slate-50">
              <WarningRow name="李华" reason="连续 5 天未登录" risk="高" time="2小时前" />
              <WarningRow name="张伟" reason="高数模拟分骤降 30%" risk="中" time="5小时前" />
              <WarningRow name="王芳" reason="英语词汇练习正确率低于 40%" risk="中" time="昨天" />
              <WarningRow name="赵敏" reason="课程进度停滞 10 天" risk="低" time="3天前" />
            </div>
          </div>
        </div>

        {/* Course Performance */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            课程热度与评价
          </h3>
          <div className="space-y-6">
            <PerformanceBar label="高等数学系统课" value={92} color="bg-blue-500" />
            <PerformanceBar label="专升本英语核心3500" value={85} color="bg-indigo-500" />
            <PerformanceBar label="大数据专业导论" value={64} color="bg-slate-400" />
            <PerformanceBar label="历年真题精讲" value={78} color="bg-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, trend, icon, color = "text-emerald-600" }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 ${color}`}>{trend}</span>
      </div>
      <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function WarningRow({ name, reason, risk, time }: any) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{name[0]}</div>
        <div>
          <div className="text-sm font-bold text-slate-800">{name}</div>
          <div className="text-[11px] text-slate-500">{reason}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
          risk === '高' ? 'bg-red-50 text-red-600' : risk === '中' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {risk}风险
        </span>
        <span className="text-[10px] text-slate-400">{time}</span>
        <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
      </div>
    </div>
  );
}

function PerformanceBar({ label, value, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="text-slate-400">{value}% 满意度</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
