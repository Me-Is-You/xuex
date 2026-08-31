import React from 'react';
import { User, Bell, Shield, Keyboard, CreditCard } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">设置</h2>
      
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 min-h-[500px]">
          {/* Sidebar */}
          <div className="bg-slate-50 border-r border-slate-100 p-6 space-y-1">
            <SettingsLink icon={<User size={18} />} label="账号信息" active />
            <SettingsLink icon={<Bell size={18} />} label="通知设置" />
            <SettingsLink icon={<Shield size={18} />} label="安全隐私" />
            <SettingsLink icon={<Keyboard size={18} />} label="学习偏好" />
            <SettingsLink icon={<CreditCard size={18} />} label="订阅计划" />
          </div>

          {/* Content */}
          <div className="md:col-span-3 p-8">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                JS
              </div>
              <div>
                <h3 className="text-xl font-bold">江同学</h3>
                <p className="text-slate-500 text-sm">大数据技术专业 · 2027 届</p>
                <button className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700">更换头像</button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="姓名" defaultValue="江同学" />
                <InputGroup label="手机号" defaultValue="138****8888" />
              </div>
              <InputGroup label="电子邮箱" defaultValue="jiang.student@example.com" />
              
              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">目标院校</h4>
                <select className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                  <option>西安邮电大学</option>
                  <option>西安交通大学城市学院</option>
                  <option>西安科技大学高新学院</option>
                  <option>西北大学现代学院</option>
                </select>
              </div>

              <div className="flex justify-end pt-6">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">保存更改</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
      active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
    }`}>
      {icon}
      {label}
    </div>
  );
}

function InputGroup({ label, defaultValue }: { label: string, defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase">{label}</label>
      <input 
        type="text" 
        defaultValue={defaultValue}
        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  );
}
