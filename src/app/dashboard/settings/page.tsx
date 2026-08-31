'use client';

import React, { useEffect, useState } from 'react';
import { User, Bell, Shield, Keyboard, CreditCard, Download, Save, Lock, List } from 'lucide-react';
import { api, toCsv, downloadCsv, fmtDateTime } from '@/lib/client';
import { maskPhone } from '@/lib/csv';
import { useUser } from '@/lib/user-context';

export default function SettingsPage() {
  const { user } = useUser();
  const [tab, setTab] = useState('account');
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const load = () => {
    api('/api/profile').then(setProfile).catch(() => {});
    api('/api/logs?days=7&limit=40').then(setLogs).catch(() => {});
  };
  useEffect(() => { load(); }, [user.id]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    await api('/api/profile', { method: 'PUT', body: profile }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const exportMyData = async () => {
    const all = await api('/api/questions?limit=200').catch(() => [] as any[]);
    const prog = await api('/api/mastery').catch(() => ({ mastery: [] }));
    downloadCsv(
      `我的学习数据_${user.name}_${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ['知识点', '学科', '掌握度(%)', '状态', '答题数'],
        prog.mastery.map((m: any) => [m.name, m.subject, m.mastery, m.status, m.total]),
      ),
    );
  };

  const LINKS = [
    ['account', '账号信息', <User size={17} key="account" />],
    ['prefs', '学习偏好', <Keyboard size={17} key="prefs" />],
    ['privacy', '安全与隐私', <Shield size={17} key="privacy" />],
    ['data', '我的数据', <Download size={17} key="data" />],
    ['logs', '操作日志', <List size={17} key="logs" />],
    ['plan', '订阅计划', <CreditCard size={17} key="plan" />],
  ] as const;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">设置</h2>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 min-h-[520px]">
          {/* 侧边 */}
          <div className="bg-slate-50 border-r border-slate-100 p-5 space-y-1">
            {LINKS.map(([v, label, icon]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  tab === v ? 'bg-white text-leaf-600 shadow-sm' : 'text-slate-500 hover:bg-white/60'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* 内容 */}
          <div className="md:col-span-3 p-8">
            {tab === 'account' && (
              <div>
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-leaf-500 to-leaf-800 flex items-center justify-center text-white text-2xl font-bold">
                    {user.name.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{user.name}</h3>
                    <p className="text-slate-500 text-sm">{user.major ?? user.role} · 2027 届</p>
                    <p className="text-slate-400 text-xs mt-1 font-mono">{maskPhone('13800001111')}</p>
                  </div>
                </div>
                {profile && (
                  <div className="space-y-5 max-w-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">水平定位（影响推荐难度）</label>
                        <select value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value })} className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 bg-white">
                          <option value="beginner">基础（beginner）</option>
                          <option value="intermediate">进阶（intermediate）</option>
                          <option value="advanced">强化（advanced）</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">学习风格（用户画像）</label>
                        <select value={profile.style} onChange={(e) => setProfile({ ...profile, style: e.target.value })} className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 bg-white">
                          <option value="visual">视觉型</option>
                          <option value="auditory">听觉型</option>
                          <option value="kinesthetic">动觉型</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">目标院校</label>
                      <select value={profile.targetUniversity ?? ''} onChange={(e) => setProfile({ ...profile, targetUniversity: e.target.value })} className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 bg-white">
                        <option>西安邮电大学</option>
                        <option>西安交通大学城市学院</option>
                        <option>西安科技大学高新学院</option>
                        <option>西北大学现代学院</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">每日学习时长目标（分钟）</label>
                      <input
                        type="number"
                        value={profile.dailyMinutes ?? 120}
                        onChange={(e) => setProfile({ ...profile, dailyMinutes: Number(e.target.value) })}
                        className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      {saved && <span className="text-xs font-bold text-leaf-600 self-center">✓ 已保存（画像已更新，推荐将重新计算）</span>}
                      <button onClick={save} disabled={saving} className="bg-leaf-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-leaf-700 disabled:opacity-50 flex items-center gap-2">
                        <Save size={15} /> {saving ? '保存中…' : '保存更改'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'prefs' && (
              <div className="space-y-5 max-w-lg">
                <h3 className="font-bold">学习偏好</h3>
                <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 leading-relaxed">
                  学习偏好写入用户画像（user_profiles），供 AI 推荐引擎与自适应测评使用：水平定位决定基准难度，学习风格影响资源推荐排序，每日时长目标用于学习预警。
                </div>
                {profile && (
                  <label className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl cursor-pointer">
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2"><Bell size={14} className="text-leaf-500" /> 学习提醒推送</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">每日学习任务未完成时推送提醒</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!profile.notifyReminder}
                      onChange={(e) => setProfile({ ...profile, notifyReminder: e.target.checked })}
                      className="w-5 h-5 accent-leaf-600"
                    />
                  </label>
                )}
              </div>
            )}

            {tab === 'privacy' && (
              <div className="space-y-4 max-w-lg">
                <h3 className="font-bold">安全与隐私</h3>
                {[
                  ['手机号脱敏', '管理端/导出报表中手机号一律显示为 138****1111 形式'],
                  ['数据加密存储', '生产环境启用 TLS + 字段级加密（演示环境本地存储）'],
                  ['操作日志审计', '登录、答题、发帖、排课等关键操作全量留痕，可追溯'],
                  ['未成年人保护', '家长角色仅可查看已绑定子女的学情报告，不可见其他数据'],
                ].map(([t, d]) => (
                  <div key={t} className="flex gap-3 p-4 border border-slate-100 rounded-2xl">
                    <Lock size={15} className="text-leaf-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-bold">{t}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'data' && (
              <div className="space-y-4 max-w-lg">
                <h3 className="font-bold">我的数据</h3>
                <p className="text-xs text-slate-400">数据跨端实时同步（Web / iOS / Android / 平板），离线学习进度联网后自动回传。你可随时导出个人数据。</p>
                <button onClick={exportMyData} className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800">
                  <Download size={15} /> 导出我的学习数据（CSV）
                </button>
              </div>
            )}

            {tab === 'logs' && (
              <div>
                <h3 className="font-bold mb-4">操作日志（近 7 天，行为埋点审计）</h3>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-2">
                  {logs.length === 0 && <p className="text-sm text-slate-300 text-center py-8">暂无日志</p>}
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50/60 rounded-xl text-xs">
                      <span className="font-mono font-bold text-leaf-600 w-28 shrink-0">{l.actionType}</span>
                      <span className="text-slate-500 flex-1 truncate">
                        {l.entityId ? `对象 #${l.entityId} · ` : ''}
                        {l.duration ? `耗时 ${l.duration}s · ` : ''}
                        {l.meta ? JSON.stringify(l.meta) : '—'}
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono shrink-0">{fmtDateTime(l.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'plan' && (
              <div className="space-y-4 max-w-lg">
                <h3 className="font-bold">订阅计划</h3>
                <div className="p-5 bg-gradient-to-br from-leaf-600 to-leaf-700 text-white rounded-3xl">
                  <div className="text-xs font-bold text-leaf-100 uppercase mb-1">当前套餐</div>
                  <div className="text-2xl font-black mb-3">Pro 专业版</div>
                  <ul className="text-[11px] space-y-1.5 text-leaf-50/90">
                    <li>✓ AI 智能助教 7×24 在线答疑</li>
                    <li>✓ 知识图谱 + 自适应测评 + 智能推题</li>
                    <li>✓ 全量题库与直播课堂</li>
                    <li>✓ 学情报告导出</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
