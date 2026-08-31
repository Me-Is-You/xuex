'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, AlertTriangle, Layers, Calendar, ClipboardList, GraduationCap,
  ShieldCheck, Users, Download, Plus, Check, X, RefreshCw, Ban, Send, Building2,
  Radar, HeartPulse, Satellite, Activity,
} from 'lucide-react';
import { api, SUBJECT_LABEL, TYPE_LABEL, STATUS_LABEL, toCsv, downloadCsv, fmtDateTime } from '@/lib/client';
import { useUser } from '@/lib/user-context';

type Tab = 'overview' | 'alerts' | 'resources' | 'schedule' | 'exams' | 'grades' | 'users' | 'sync' | 'selfheal';

const TABS: Array<[Tab, string, React.ReactNode]> = [
  ['overview', '学情总览', <BarChart size={14} key="overview" />],
  ['alerts', '预警中心', <AlertTriangle size={14} key="alerts" />],
  ['resources', '资源管理', <Layers size={14} key="resources" />],
  ['schedule', '排课系统', <Calendar size={14} key="schedule" />],
  ['exams', '考试管理', <ClipboardList size={14} key="exams" />],
  ['grades', '成绩管理', <GraduationCap size={14} key="grades" />],
  ['users', '用户与权限', <ShieldCheck size={14} key="users" />],
  ['sync', '资源同步', <Radar size={14} key="sync" />],
  ['selfheal', '自愈中心', <HeartPulse size={14} key="selfheal" />],
];

export default function AdminPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('overview');
  const [notice, setNotice] = useState('');
  const [okNotice, setOkNotice] = useState('');

  const flash = (msg: string, isErr = false) => {
    setOkNotice(isErr ? '' : msg);
    setNotice(isErr ? msg : '');
    setTimeout(() => { setNotice(''); setOkNotice(''); }, 3500);
  };

  /* ============ 学情总览 ============ */
  const [cls, setCls] = useState<any>(null);
  const [clsSubject, setClsSubject] = useState('Math');
  useEffect(() => {
    if (tab === 'overview') api(`/api/stats/class?subject=${clsSubject}`).then(setCls).catch(() => {});
  }, [tab, clsSubject]);

  /* ============ 预警中心 ============ */
  const [alertsData, setAlertsData] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const loadAlerts = useCallback(() => {
    api('/api/alerts').then(setAlertsData).catch(() => {});
    api('/api/intervention-rules').then(setRules).catch(() => {});
  }, []);
  useEffect(() => { if (tab === 'alerts') loadAlerts(); }, [tab, loadAlerts]);

  const handleAlert = async (id: number, action: string) => {
    await api(`/api/alerts/${id}`, { method: 'POST', body: { actions: [action] } }).catch((e) => flash(e.message, true));
    flash('已执行干预动作');
    loadAlerts();
  };
  const ignoreAlert = async (id: number) => {
    await api(`/api/alerts/${id}`, { method: 'POST', body: { ignore: true } }).catch(() => {});
    loadAlerts();
  };
  const toggleRule = async (r: any) => {
    await api('/api/intervention-rules', { method: 'PUT', body: { id: r.id, enabled: !r.enabled } }).catch(() => {});
    loadAlerts();
  };

  /* ============ 资源管理 ============ */
  const [resources, setResources] = useState<any[]>([]);
  const [resForm, setResForm] = useState(false);
  const [res, setRes] = useState({ title: '', type: 'video', subject: 'Math', difficulty: 3, grade: '专升本', tags: '', description: '' });
  const loadResources = () => api('/api/resources?status=published').then(setResources).catch(() => {});
  useEffect(() => { if (tab === 'resources') loadResources(); }, [tab]);

  const addResource = async () => {
    if (!res.title.trim()) return;
    await api('/api/resources', { method: 'POST', body: { ...res, tags: res.tags ? res.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [] } }).catch((e) => flash(e.message, true));
    flash('资源已提交，AI 智能标注完成，状态为「待审核」');
    setResForm(false);
    loadResources();
  };
  const reviewResource = async (id: number, status: string) => {
    await api(`/api/resources/manage`, { method: 'PATCH', body: { id, status } }).catch((e) => flash(e.message, true));
    flash(status === 'published' ? '已审核上架' : '已下架');
    loadResources();
  };

  /* ============ 排课 ============ */
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sch, setSch] = useState({ courseTitle: '', subject: 'Math', teacherName: '张剑峰', dayOfWeek: 1, startTime: '08:00', endTime: '10:00', room: 'A-101' });
  const loadSchedules = () => api('/api/schedules').then(setSchedules).catch(() => {});
  useEffect(() => { if (tab === 'schedule') loadSchedules(); }, [tab]);
  const addSchedule = async () => {
    await api('/api/schedules', { method: 'POST', body: sch }).then(() => flash('排课成功（已通过冲突检测）')).catch((e) => flash(e.message, true));
    loadSchedules();
  };
  const autoSchedule = async () => {
    try {
      const placed = await api<any[]>('/api/schedules/auto', { method: 'POST' });
      flash(placed.length ? `自动排课完成：${placed.map((p: any) => p.message).join('；')}` : '没有待排课程');
    } catch (e: any) {
      flash(e.message, true);
    }
    loadSchedules();
  };
  const delSchedule = async (id: number) => {
    await api(`/api/schedules?id=${id}`, { method: 'DELETE' }).catch(() => {});
    loadSchedules();
  };

  /* ============ 考试管理 ============ */
  const [exams, setExams] = useState<any[]>([]);
  const [examForm, setExamForm] = useState(false);
  const [exam, setExam] = useState({ title: '', subject: 'Math', durationMin: 120, mode: 'random', count: 10, difficulty: 3, shuffle: true, fullscreen: false, timerLock: true, antiCopy: false });
  const [allQs, setAllQs] = useState<any[]>([]);
  const [pickedQs, setPickedQs] = useState<number[]>([]);
  const loadExams = () => api('/api/exams').then(setExams).catch(() => {});
  useEffect(() => {
    if (tab === 'exams') {
      loadExams();
      api('/api/questions?limit=200').then(setAllQs).catch(() => {});
    }
  }, [tab]);
  const addExam = async () => {
    if (!exam.title.trim()) return;
    const body = exam.mode === 'fixed'
      ? { title: exam.title, subject: exam.subject, durationMin: exam.durationMin, mode: 'fixed', questionIds: pickedQs, antiCheat: { shuffle: exam.shuffle, fullscreen: exam.fullscreen, timerLock: exam.timerLock, antiCopy: exam.antiCopy } }
      : { title: exam.title, subject: exam.subject, durationMin: exam.durationMin, mode: 'random', config: { count: exam.count, difficulty: exam.difficulty, subject: exam.subject }, antiCheat: { shuffle: exam.shuffle, fullscreen: exam.fullscreen, timerLock: exam.timerLock, antiCopy: exam.antiCopy } };
    await api('/api/exams', { method: 'POST', body }).catch((e) => flash(e.message, true));
    flash('试卷已创建（草稿）');
    setExamForm(false);
    loadExams();
  };
  const setExamStatus = async (id: number, status: string) => {
    await api(`/api/exams/${id}`, { method: 'PUT', body: { status } }).catch((e) => flash(e.message, true));
    flash(status === 'published' ? '试卷已发布' : '已归档');
    loadExams();
  };

  /* ============ 成绩管理 ============ */
  const [grades, setGrades] = useState<any[]>([]);
  const [gStats, setGStats] = useState<any>(null);
  const [gSubject, setGSubject] = useState('Math');
  const [gOrg, setGOrg] = useState('');
  const [gForm, setGForm] = useState({ studentId: 'jiang2027', studentName: '江同学', subject: 'Math', examName: '补录成绩', score: 80 });
  const loadGrades = () => {
    const qs = new URLSearchParams({ subject: gSubject });
    if (gOrg) qs.set('orgId', gOrg);
    api(`/api/grades?${qs.toString()}`).then(setGrades).catch(() => {});
    api(`/api/grades/stats?subject=${gSubject}${gOrg ? `&orgId=${gOrg}` : ''}`).then(setGStats).catch(() => {});
  };
  useEffect(() => { if (tab === 'grades') loadGrades(); }, [tab, gSubject, gOrg]);
  const addGrade = async () => {
    await api('/api/grades', { method: 'POST', body: gForm }).catch((e) => flash(e.message, true));
    flash('成绩已录入');
    loadGrades();
  };
  const exportGrades = () => {
    downloadCsv(`成绩单_${gSubject}_${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(['学号', '姓名', '手机号(脱敏)', '科目', '考试', '分数', '满分'],
        grades.map((g) => [g.studentId, g.studentName, g.phoneMasked, SUBJECT_LABEL[g.subject], g.examName, g.score, g.maxScore])));
  };

  /* ============ 用户与权限 ============ */
  const [usersList, setUsersList] = useState<any[]>([]);
  const [orgsTree, setOrgsTree] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  useEffect(() => {
    if (tab === 'users') {
      api(`/api/users${roleFilter ? `?role=${roleFilter}` : ''}`).then(setUsersList).catch(() => {});
      api('/api/orgs').then(setOrgsTree).catch(() => {});
    }
  }, [tab, roleFilter]);

  /* ============ 资源同步（每日 0 点智能采集） ============ */
  const [syncData, setSyncData] = useState<any>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const loadSync = () => api('/api/resources/sync').then(setSyncData).catch(() => {});
  useEffect(() => { if (tab === 'sync') loadSync(); }, [tab]);
  const runSync = async () => {
    setSyncBusy(true);
    setSyncResult(null);
    try {
      const r = await api<any>('/api/resources/sync', { method: 'POST', body: { force: true } });
      setSyncResult(r);
      flash(`同步完成：入库题目 ${r.ingestedQuestions} 道 / 资源 ${r.ingestedResources} 条`);
    } catch (e: any) {
      flash(e.message, true);
    } finally {
      setSyncBusy(false);
      loadSync();
    }
  };

  /* ============ 自愈中心（11 模块自愈算法） ============ */
  const [healData, setHealData] = useState<any>(null);
  const [healBusy, setHealBusy] = useState(false);
  const [healResult, setHealResult] = useState<any>(null);
  const loadHeal = () => api('/api/selfheal').then(setHealData).catch(() => {});
  useEffect(() => { if (tab === 'selfheal') loadHeal(); }, [tab]);
  const runHeal = async (module?: string) => {
    setHealBusy(true);
    setHealResult(null);
    try {
      const r = await api<any>('/api/selfheal', { method: 'POST', body: module ? { module } : {} });
      setHealResult(r);
      flash(`巡检完成：检测 ${r.totalDetected} 处异常，自动修复 ${r.totalRepaired} 处`);
    } catch (e: any) {
      flash(e.message, true);
    } finally {
      setHealBusy(false);
      loadHeal();
    }
  };

  const ADMIN = user.role === 'admin';
  const LEVEL: Record<string, { label: string; cls: string }> = {
    high: { label: '高', cls: 'bg-red-50 text-red-600' },
    medium: { label: '中', cls: 'bg-amber-50 text-amber-600' },
    low: { label: '低', cls: 'bg-slate-100 text-slate-500' },
  };
  const DAYS = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3"><ShieldCheck className="text-leaf-600" /> 教学管理中心</h2>
          <p className="text-slate-500 text-sm mt-1">
            {ADMIN ? '管理员视角 · 全机构数据' : '教师视角 · 本机构数据'} · 数据级权限已按机构隔离
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-leaf-600 text-white shadow-md shadow-leaf-100' : 'bg-white text-slate-500 border border-slate-100'}`}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {notice && <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600">⚠ {notice}</div>}
      {okNotice && <div className="p-3 bg-leaf-50 border border-leaf-100 rounded-2xl text-xs font-bold text-leaf-700">✓ {okNotice}</div>}

      {/* ============ 学情总览 ============ */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold">班级学情对比</h3>
              <div className="flex gap-1">
                {['Math', 'English'].map((s) => (
                  <button key={s} onClick={() => setClsSubject(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${clsSubject === s ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500'}`}>{SUBJECT_LABEL[s]}</button>
                ))}
              </div>
            </div>
            {cls ? (
              <div className="space-y-2.5">
                {cls.students.map((s: any, i: number) => (
                  <div key={s.studentId} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
                    <span className="w-16 text-xs font-bold text-slate-600 truncate">{s.name}</span>
                    <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-leaf-400 to-leaf-600 rounded-full" style={{ width: `${s.avg}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-black">{s.avg}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-50 text-[11px] text-slate-400 font-bold">班级均分 {cls.classAvg} · 参考 {cls.total} 人</div>
              </div>
            ) : <p className="text-sm text-slate-300 text-center py-10">加载中…</p>}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-orange-500" size={16} /> 待处理预警</h3>
              {alertsData ? (
                <div className="space-y-2.5">
                  {alertsData.alerts.filter((a: any) => a.status === 'pending').slice(0, 4).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50/60 rounded-xl">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${LEVEL[a.level].cls}`}>{LEVEL[a.level].label}</span>
                      <span className="text-xs font-bold text-slate-600">{a.studentName}</span>
                      <span className="text-[11px] text-slate-400 truncate flex-1">{a.message}</span>
                      <button onClick={() => setTab('alerts')} className="text-[10px] font-bold text-leaf-600 shrink-0">处理 →</button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-300 text-center py-8">加载中…</p>}
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold mb-3">平台指标</h3>
              <div className="grid grid-cols-2 gap-4">
                {[['活跃学员', '9 人'], ['本周新增预警', alertsData ? String(alertsData.newlyCreated) : '-'], ['待审核资源', '-'], ['在线课程', '6 门']].map(([k, v]) => (
                  <div key={k} className="p-4 bg-slate-50 rounded-2xl text-center">
                    <div className="text-xl font-black">{v}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ 预警中心 ============ */}
      {tab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-sm">预警列表（引擎自动扫描 + 规则触发）</h3>
            {(alertsData?.alerts ?? []).map((a: any) => (
              <div key={a.id} className={`bg-white rounded-3xl border p-5 shadow-sm ${a.status === 'pending' ? 'border-orange-100' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${LEVEL[a.level].cls}`}>等级 {LEVEL[a.level].label}</span>
                  <span className="text-sm font-bold">{a.studentName}</span>
                  <span className="text-[10px] text-slate-300">{fmtDateTime(a.createdAt)}</span>
                  <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${a.status === 'pending' ? 'bg-red-50 text-red-500' : a.status === 'handled' ? 'bg-leaf-50 text-leaf-600' : 'bg-slate-100 text-slate-400'}`}>
                    {a.status === 'pending' ? '待处理' : a.status === 'handled' ? '已干预' : '已忽略'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">{a.message}</p>
                {a.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    {['消息提醒', '教师通知', '推送补救内容'].map((act) => (
                      <button key={act} onClick={() => handleAlert(a.id, act)} className="flex items-center gap-1 px-3 py-1.5 bg-leaf-50 text-leaf-700 rounded-lg text-[11px] font-bold hover:bg-leaf-100">
                        <Send size={11} /> {act}
                      </button>
                    ))}
                    <button onClick={() => ignoreAlert(a.id)} className="px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-[11px] font-bold hover:bg-slate-100">忽略</button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">已执行：{(a.actions ?? []).join('、') || '—'}</p>
                )}
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-bold text-sm mb-3">干预策略配置</h3>
            <div className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className={`bg-white rounded-3xl border p-5 shadow-sm ${r.enabled ? '' : 'opacity-60'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold">{r.name}</span>
                    <button onClick={() => toggleRule(r)} className={`w-9 h-5 rounded-full transition-colors relative ${r.enabled ? 'bg-leaf-500' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${r.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    规则：{JSON.stringify(r.config)}
                  </p>
                  <p className="text-[10px] text-leaf-600 font-bold">动作：{[r.action.remind && '消息提醒', r.action.notifyTeacher && '教师通知', r.action.pushContent && '推送补救内容'].filter(Boolean).join(' + ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ 资源管理 ============ */}
      {tab === 'resources' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold">资源库（上传 · 审核 · 版本 · 上下架）</h3>
            <button onClick={() => setResForm(true)} className="flex items-center gap-1.5 bg-leaf-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-leaf-700">
              <Plus size={13} /> 上传新资源
            </button>
          </div>
          {resForm && (
            <div className="p-5 border-b border-leaf-50 bg-leaf-50/30 grid grid-cols-2 md:grid-cols-4 gap-3">
              <input value={res.title} onChange={(e) => setRes({ ...res, title: e.target.value })} placeholder="资源标题" className="col-span-2 p-2.5 bg-white border border-slate-100 rounded-xl text-xs focus:outline-none" />
              <select value={res.type} onChange={(e) => setRes({ ...res, type: e.target.value })} className="p-2.5 bg-white border border-slate-100 rounded-xl text-xs">
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={res.subject} onChange={(e) => setRes({ ...res, subject: e.target.value })} className="p-2.5 bg-white border border-slate-100 rounded-xl text-xs">
                <option value="Math">数学</option><option value="English">英语</option>
              </select>
              <input value={res.tags} onChange={(e) => setRes({ ...res, tags: e.target.value })} placeholder="标签（逗号分隔，留空则 AI 自动标注）" className="col-span-2 p-2.5 bg-white border border-slate-100 rounded-xl text-xs" />
              <select value={res.difficulty} onChange={(e) => setRes({ ...res, difficulty: Number(e.target.value) })} className="p-2.5 bg-white border border-slate-100 rounded-xl text-xs">
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>难度 {d}</option>)}
              </select>
              <input value={res.description} onChange={(e) => setRes({ ...res, description: e.target.value })} placeholder="描述" className="p-2.5 bg-white border border-slate-100 rounded-xl text-xs" />
              <button onClick={addResource} className="bg-leaf-600 text-white rounded-xl text-xs font-bold py-2.5">提交（进入审核流）</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50">
                  <th className="p-4">资源</th><th className="p-4">类型</th><th className="p-4">状态</th><th className="p-4">版本</th><th className="p-4">学习人数</th><th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-700 max-w-[220px] truncate">{r.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{SUBJECT_LABEL[r.subject]} · {(r.tags ?? []).slice(0, 3).map((t: string) => `#${t}`).join(' ')}</div>
                    </td>
                    <td className="p-4 text-[11px] font-bold text-slate-500">{TYPE_LABEL[r.type]}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${r.status === 'published' ? 'bg-leaf-50 text-leaf-600' : r.status === 'pending' ? 'bg-amber-50 text-amber-600' : r.status === 'offline' ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] font-bold text-slate-400">v{r.version}</td>
                    <td className="p-4 text-[11px] font-bold text-slate-400">{r.studentCount}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1.5">
                        {r.status === 'pending' && (
                          <button onClick={() => reviewResource(r.id, 'published')} className="flex items-center gap-1 px-3 py-1.5 bg-leaf-600 text-white rounded-lg text-[11px] font-bold hover:bg-leaf-700">
                            <Check size={11} /> 审核通过
                          </button>
                        )}
                        {r.status === 'published' && (
                          <button onClick={() => reviewResource(r.id, 'offline')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold hover:bg-slate-200">
                            <Ban size={11} /> 下架
                          </button>
                        )}
                        {r.status === 'offline' && (
                          <button onClick={() => reviewResource(r.id, 'published')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-200">
                            <RefreshCw size={11} /> 重新上架
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ 排课系统 ============ */}
      {tab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold">周课表</h3>
              <button onClick={autoSchedule} className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800">
                <RefreshCw size={13} /> 自动排课（待排课程）
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50">
                    <th className="p-4">星期</th><th className="p-4">时间</th><th className="p-4">课程</th><th className="p-4">教师</th><th className="p-4">教室</th><th className="p-4">状态</th><th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                      <td className="p-4 text-xs font-black">周{DAYS[s.dayOfWeek - 1]}</td>
                      <td className="p-4 text-xs font-bold font-mono">{s.startTime}-{s.endTime}</td>
                      <td className="p-4 text-xs font-bold text-slate-700">{s.courseTitle}</td>
                      <td className="p-4 text-[11px] text-slate-500">{s.teacherName}</td>
                      <td className="p-4 text-[11px] text-slate-500">{s.room}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'confirmed' ? 'bg-leaf-50 text-leaf-600' : 'bg-amber-50 text-amber-600'}`}>
                          {s.status === 'confirmed' ? '已确认' : '待排'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => delSchedule(s.id)} className="p-1.5 text-slate-300 hover:text-red-500"><X size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold mb-4">手动排课（自动冲突检测）</h3>
            <div className="space-y-3">
              <input value={sch.courseTitle} onChange={(e) => setSch({ ...sch, courseTitle: e.target.value })} placeholder="课程名称" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-leaf-500" />
              <select value={sch.teacherName} onChange={(e) => setSch({ ...sch, teacherName: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                <option>张剑峰</option><option>王琳</option>
              </select>
              <div className="grid grid-cols-3 gap-2">
                <select value={sch.dayOfWeek} onChange={(e) => setSch({ ...sch, dayOfWeek: Number(e.target.value) })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  {DAYS.map((d, i) => <option key={i} value={i + 1}>周{d}</option>)}
                </select>
                <input type="time" value={sch.startTime} onChange={(e) => setSch({ ...sch, startTime: e.target.value })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
                <input type="time" value={sch.endTime} onChange={(e) => setSch({ ...sch, endTime: e.target.value })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
              </div>
              <input value={sch.room} onChange={(e) => setSch({ ...sch, room: e.target.value })} placeholder="教室" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
              <button onClick={addSchedule} className="w-full bg-leaf-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-leaf-700">
                排课（检测教师/教室冲突）
              </button>
              <p className="text-[10px] text-slate-400 leading-relaxed">冲突规则：同一教师或同一教室在同一时段已有课程时，返回 409 并提示冲突明细。</p>
            </div>
          </div>
        </div>
      )}

      {/* ============ 考试管理 ============ */}
      {tab === 'exams' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">试卷列表（固定卷 / 随机组卷 / 防作弊设置）</h3>
            <button onClick={() => setExamForm((s) => !s)} className="flex items-center gap-1.5 bg-leaf-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-leaf-700">
              <Plus size={13} /> 新建试卷
            </button>
          </div>
          {examForm && (
            <div className="bg-white rounded-3xl border border-leaf-100 p-5 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3">
              <input value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} placeholder="试卷标题" className="col-span-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none" />
              <select value={exam.subject} onChange={(e) => setExam({ ...exam, subject: e.target.value })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                <option value="Math">数学</option><option value="English">英语</option>
              </select>
              <select value={exam.mode} onChange={(e) => setExam({ ...exam, mode: e.target.value as any })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                <option value="random">随机组卷</option><option value="fixed">固定卷</option>
              </select>
              {exam.mode === 'random' ? (
                <>
                  <input type="number" value={exam.count} onChange={(e) => setExam({ ...exam, count: Number(e.target.value) })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" title="题数" />
                  <select value={exam.difficulty} onChange={(e) => setExam({ ...exam, difficulty: Number(e.target.value) })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                    {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>难度 {d}</option>)}
                  </select>
                  <input type="number" value={exam.durationMin} onChange={(e) => setExam({ ...exam, durationMin: Number(e.target.value) })} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" title="时长(分钟)" />
                </>
              ) : (
                <div className="col-span-2 md:col-span-4 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-3 space-y-1.5 bg-slate-50/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase">选择题目（已选 {pickedQs.length}）</p>
                  {allQs.map((q) => (
                    <label key={q.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pickedQs.includes(q.id)}
                        onChange={(e) => setPickedQs((p) => (e.target.checked ? [...p, q.id] : p.filter((x) => x !== q.id)))}
                        className="accent-leaf-600"
                      />
                      <span className="text-slate-500">{SUBJECT_LABEL[q.subject]}·{q.category}·难度{q.difficulty}</span>
                      <span className="text-slate-400 truncate">{q.content.slice(0, 44)}…</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="col-span-2 md:col-span-4 flex flex-wrap gap-4 items-center text-[11px] font-bold text-slate-500">
                <span>防作弊设置：</span>
                {([['shuffle', '题目乱序'], ['fullscreen', '全屏锁定'], ['timerLock', '倒计时交卷'], ['antiCopy', '禁止复制']] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={(exam as any)[k]} onChange={(e) => setExam({ ...exam, [k]: e.target.checked })} className="accent-leaf-600" />
                    {l}
                  </label>
                ))}
              </div>
              <button onClick={addExam} className="bg-leaf-600 text-white rounded-xl text-xs font-bold py-2.5">创建试卷</button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((e) => (
              <div key={e.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-bold">{e.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {SUBJECT_LABEL[e.subject]} · {e.mode === 'fixed' ? '固定卷' : '随机组卷'} {e.mode === 'random' ? `${e.config?.count ?? 10} 题` : `${(e.questionIds as number[])?.length ?? 0} 题`} · {e.durationMin} 分钟
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${e.status === 'published' ? 'bg-leaf-50 text-leaf-600' : e.status === 'draft' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    {e.status === 'published' ? '已发布' : e.status === 'draft' ? '草稿' : '已归档'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {e.antiCheat?.shuffle && <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full">乱序</span>}
                  {e.antiCheat?.fullscreen && <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full">全屏</span>}
                  {e.antiCheat?.timerLock && <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full">计时交卷</span>}
                  {e.antiCheat?.antiCopy && <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full">禁复制</span>}
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">{e.submitCount} 人已交卷</span>
                </div>
                <div className="flex gap-2">
                  {e.status === 'draft' && (
                    <button onClick={() => setExamStatus(e.id, 'published')} className="flex items-center gap-1 px-3.5 py-1.5 bg-leaf-600 text-white rounded-lg text-[11px] font-bold hover:bg-leaf-700">
                      <Send size={11} /> 发布
                    </button>
                  )}
                  {e.status === 'published' && (
                    <button onClick={() => setExamStatus(e.id, 'archived')} className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold hover:bg-slate-200">
                      归档
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ 成绩管理 ============ */}
      {tab === 'grades' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex gap-2">
              {['Math', 'English'].map((s) => (
                <button key={s} onClick={() => setGSubject(s)} className={`px-4 py-2 rounded-xl text-xs font-bold ${gSubject === s ? 'bg-leaf-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>{SUBJECT_LABEL[s]}</button>
              ))}
              <select value={gOrg} onChange={(e) => setGOrg(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-500 border border-slate-100">
                <option value="">全部机构</option>
                <option value="1">主校区</option><option value="2">北校区</option><option value="3">南校区</option>
              </select>
            </div>
            <button onClick={exportGrades} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Download size={13} /> 导出成绩单 CSV（手机号已脱敏）
            </button>
          </div>

          {gStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[['平均分', gStats.avg], ['最高分', gStats.max], ['最低分', gStats.min], ['记录数', gStats.count]].map(([k, v]) => (
                <div key={k as string} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
                  <div className="text-2xl font-black">{v}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-1">{k}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50">
                    <th className="p-4">排名</th><th className="p-4">学生</th><th className="p-4">手机号(脱敏)</th><th className="p-4">考试</th><th className="p-4">分数</th>
                  </tr>
                </thead>
                <tbody>
                  {(gStats?.ranking ?? []).map((r: any) => {
                    const g = grades.find((x) => x.studentId === r.studentId);
                    return (
                      <tr key={r.studentId} className="border-b border-slate-50 hover:bg-slate-50/40">
                        <td className="p-4">
                          <span className={`w-6 h-6 rounded-lg inline-flex items-center justify-center text-[10px] font-black ${r.rank <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{r.rank}</span>
                        </td>
                        <td className="p-4 text-xs font-bold">{r.studentName}</td>
                        <td className="p-4 text-[11px] font-mono text-slate-400">{g?.phoneMasked ?? '-'}</td>
                        <td className="p-4 text-[11px] text-slate-500">{g?.examName ?? '-'}</td>
                        <td className="p-4 text-sm font-black text-leaf-600">{g?.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h4 className="text-xs font-bold mb-3">分数段分布</h4>
                {gStats && (
                  <div className="space-y-2">
                    {Object.entries(gStats.distribution as Record<string, number>).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-12 text-[10px] font-bold text-slate-400">{k}</span>
                        <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-leaf-500 rounded-full" style={{ width: `${gStats.count ? (v / gStats.count) * 100 : 0}%` }} />
                        </div>
                        <span className="w-6 text-right text-[10px] font-black">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h4 className="text-xs font-bold mb-3">成绩录入</h4>
                <div className="space-y-2.5">
                  <input value={gForm.studentName} onChange={(e) => setGForm({ ...gForm, studentName: e.target.value, studentId: e.target.value })} placeholder="学生姓名" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
                  <input value={gForm.examName} onChange={(e) => setGForm({ ...gForm, examName: e.target.value })} placeholder="考试名称" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
                  <input type="number" value={gForm.score} onChange={(e) => setGForm({ ...gForm, score: Number(e.target.value) })} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" title="分数" />
                  <button onClick={addGrade} className="w-full bg-leaf-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-leaf-700">录入成绩</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ 用户与权限（管理员） ============ */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold">用户与角色（菜单级 / 按钮级 / 数据级权限）</h3>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-100">
                <option value="">全部角色</option>
                <option value="student">学生</option><option value="teacher">教师</option>
                <option value="admin">管理员</option><option value="parent">家长</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50">
                    <th className="p-4">用户</th><th className="p-4">角色</th><th className="p-4">机构</th><th className="p-4">手机号(脱敏)</th><th className="p-4">权限说明</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-leaf-400 to-leaf-700 text-white text-xs font-bold flex items-center justify-center">{u.name.slice(0, 1)}</span>
                          <div>
                            <div className="text-xs font-bold">{u.name}</div>
                            <div className="text-[10px] text-slate-400">{u.major ?? u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          u.role === 'admin' ? 'bg-purple-50 text-purple-600' : u.role === 'teacher' ? 'bg-blue-50 text-blue-600' : u.role === 'parent' ? 'bg-amber-50 text-amber-600' : 'bg-leaf-50 text-leaf-600'
                        }`}>
                          {u.role === 'student' ? '学生' : u.role === 'teacher' ? '教师' : u.role === 'admin' ? '管理员' : '家长'}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] text-slate-500">{u.orgName ?? '-'}</td>
                      <td className="p-4 text-[11px] font-mono text-slate-400">{u.phone}</td>
                      <td className="p-4 text-[10px] text-slate-400 max-w-[180px]">
                        {u.role === 'admin' ? '全机构数据 + 审核/排课/权限' : u.role === 'teacher' ? '本机构学情 + 课程/考试管理' : u.role === 'parent' ? '查看子女学情报告' : '学习功能全量 + 个人数据'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Building2 className="text-leaf-600" size={16} /> 机构层级树（多校区）</h3>
            <div className="space-y-2">
              {orgsTree.map((o: any) => (
                <div key={o.id} className="p-3 bg-slate-50/60 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">🏛 {o.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{o.headcount} 人 · {o.type === 'main' ? '主校区' : '校区'}</span>
                  </div>
                  {o.children?.map((c: any) => (
                    <div key={c.id} className="mt-2 ml-3 pl-3 border-l-2 border-leaf-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.headcount} 人</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-leaf-50/50 rounded-2xl text-[10px] text-leaf-700 leading-relaxed">
              <b>数据级权限：</b>教师仅可见本机构成绩与预警；管理员跨机构可见全量数据。演示中右上角可切换角色体验。
            </div>
          </div>
        </div>
      )}

      {tab === 'sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Radar size={17} className="text-leaf-600" /> 智能资源同步 · 每日 00:00 自动执行</h3>
              <button onClick={runSync} disabled={syncBusy} className="flex items-center gap-1.5 bg-leaf-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-leaf-700 disabled:opacity-50">
                <RefreshCw size={13} className={syncBusy ? 'animate-spin' : ''} /> {syncBusy ? '同步中…' : '立即执行一轮'}
              </button>
            </div>
            <div className="rounded-2xl border border-leaf-100 bg-leaf-50/50 p-4 mb-5 text-[11px] text-leaf-800 leading-relaxed">
              <b>管线：</b>发现（本地参数化生成器 ×12 家族 + 2 个公开 web 源）→ 抓取/生成（日期种子，可复现）→ 转换（平台 schema）→ 去重（FNV-1a 精确 + 6-gram Jaccard 近似 ≥0.85）→ 质检（可答性/解析/知识点/难度，&lt;70 拒收）→ 入库（题目即生效，资源卡走审核流）→ 留痕。
            </div>
            {syncData?.last ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                {[
                  ['生成候选', syncData.last.generated],
                  ['去重拦截', syncData.last.deduped],
                  ['质检拒收', syncData.last.rejected],
                  ['入库题目', syncData.last.ingestedQuestions],
                  ['入库资源', syncData.last.ingestedResources],
                ].map(([l, v]) => (
                  <div key={l as string} className="bg-slate-50 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-leaf-700">{v as number}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">{l as string}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 mb-5">暂无运行记录。点击「立即执行一轮」或等待每日 0 点自动同步。</div>
            )}
            {syncData?.last && (
              <div className="text-[11px] text-slate-400 mb-4">
                上次运行：{fmtDateTime(syncData.last.runAt)} · 触发方式 {syncData.last.trigger} · 耗时 {syncData.last.durationMs}ms
              </div>
            )}
            {syncResult && (
              <div className="mb-5 p-4 bg-leaf-50 rounded-2xl text-xs text-leaf-800">
                <div className="font-bold mb-2 flex items-center gap-1.5"><Activity size={13} /> 本次运行结果</div>
                {syncResult.skipped
                  ? <div className="text-amber-600">幂等跳过：{syncResult.skipReason}</div>
                  : <div>生成 {syncResult.generated} → 去重 {syncResult.deduped} / 拒收 {syncResult.rejected} → 入库题目 {syncResult.ingestedQuestions} / 资源 {syncResult.ingestedResources}</div>}
              </div>
            )}
            <h4 className="text-xs font-bold text-slate-500 mb-3">最近运行历史</h4>
            <div className="space-y-2">
              {(syncData?.recent ?? []).map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-2xl text-[11px]">
                  <span className="font-bold text-slate-600">{fmtDateTime(r.runAt)}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${r.trigger === 'cron' ? 'bg-leaf-100 text-leaf-700' : 'bg-blue-50 text-blue-600'}`}>{r.trigger === 'cron' ? '每日定时' : '手动'}</span>
                  <span>生成 {r.generated} · 入库题 {r.ingestedQuestions} · 入库资源 {r.ingestedResources}</span>
                  {r.error && <span className="text-red-500 font-bold">失败：{r.error}</span>}
                  <span className="ml-auto text-slate-400">{r.durationMs}ms</span>
                </div>
              ))}
              {(!syncData?.recent || syncData.recent.length === 0) && <div className="text-xs text-slate-300">暂无记录</div>}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Satellite size={17} className="text-leaf-600" /> 数据源健康</h3>
            <div className="space-y-3">
              {(syncData?.last?.sources ?? []).map((s: any) => (
                <div key={s.id} className="p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">{s.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'ok' ? 'bg-leaf-100 text-leaf-700' : s.status === 'degraded' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {s.status === 'ok' ? '正常' : s.status === 'degraded' ? '降级' : '失败'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{s.kind} · 抓取 {s.fetched} 条{s.generated != null ? ` · 生成 ${s.generated}` : ''}{s.error ? ` · ${s.error}` : ''}</div>
                </div>
              ))}
              {(!syncData?.last?.sources || syncData.last.sources.length === 0) && <div className="text-xs text-slate-300">执行一次同步后显示各源状态</div>}
            </div>
            <div className="mt-5 p-3 bg-slate-50 rounded-2xl text-[10px] text-slate-500 leading-relaxed">
              web 源网络不可达时自动<b>降级</b>（本地参数化生成器兜底），流程不中断 —— 鲁棒性设计。生产环境可用 cron：<code className="bg-slate-100 px-1 rounded">0 0 * * * npm run sync:daily</code>。
            </div>
          </div>
        </div>
      )}

      {tab === 'selfheal' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><HeartPulse size={18} className="text-leaf-600" /> 自愈中心 · 11 模块自愈算法</h3>
              <button onClick={() => runHeal()} disabled={healBusy} className="flex items-center gap-1.5 bg-leaf-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-leaf-700 disabled:opacity-50">
                <RefreshCw size={13} className={healBusy ? 'animate-spin' : ''} /> {healBusy ? '巡检中…' : '执行全模块巡检'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-5">
              设计原则：<b>检测 → 修复（仅安全操作）→ 留痕</b>。全部操作幂等可重跑；每次巡检写入事件审计表，可解释、可追溯。每日 0 点资源同步后自动巡检。
            </p>
            {healResult && (
              <div className="mb-5 p-4 bg-leaf-50 rounded-2xl text-xs text-leaf-800 flex items-center gap-2">
                <Activity size={14} className="text-leaf-600" />
                本次巡检：检测 <b>{healResult.totalDetected}</b> 处异常，自动修复 <b>{healResult.totalRepaired}</b> 处
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(healData?.modules ?? []).map((m: string) => {
                const ev = healResult?.events?.find((e: any) => e.module === m);
                const hist = (healData?.history ?? []).find((h: any) => h.module === m);
                return (
                  <div key={m} className="p-4 rounded-2xl border border-slate-100 hover:border-leaf-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-700">{m}</span>
                      <button onClick={() => runHeal(m)} disabled={healBusy} className="text-[10px] font-bold text-leaf-600 hover:text-leaf-800 disabled:opacity-40">执行修复 →</button>
                    </div>
                    {ev ? (
                      <div className="text-[11px] text-slate-500 leading-snug">
                        <span className={`font-bold ${ev.detected ? 'text-amber-600' : 'text-leaf-600'}`}>检测 {ev.detected}</span>
                        {' · '}<span className={`font-bold ${ev.repaired ? 'text-leaf-700' : 'text-slate-400'}`}>修复 {ev.repaired}</span>
                        <div className="mt-1.5 text-[10px] text-slate-400 leading-snug">{ev.name}：{ev.action}</div>
                      </div>
                    ) : hist ? (
                      <div className="text-[10px] text-slate-400">上次：检测 {hist.detected} / 修复 {hist.repaired}（{fmtDateTime(hist.createdAt)}）<div className="mt-1 text-[10px] leading-snug">{hist.name}</div></div>
                    ) : (
                      <div className="text-[10px] text-slate-300">尚未巡检，点击「执行修复」或全模块巡检</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h4 className="text-xs font-bold text-slate-500 mb-3">自愈事件审计（最近 50 条）</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {(healData?.history ?? []).map((h: any) => (
                <div key={h.id} className="flex flex-wrap items-center gap-2.5 p-3 bg-slate-50 rounded-2xl text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${h.level === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-leaf-100 text-leaf-700'}`}>{h.module}</span>
                  <span className="font-bold text-slate-600">{h.name}</span>
                  <span>检测 <b className={h.detected ? 'text-amber-600' : 'text-slate-400'}>{h.detected}</b> / 修复 <b className="text-leaf-700">{h.repaired}</b></span>
                  <span className="ml-auto text-slate-400">{fmtDateTime(h.createdAt)}</span>
                </div>
              ))}
              {(!healData?.history || healData.history.length === 0) && <div className="text-xs text-slate-300">暂无事件记录</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
