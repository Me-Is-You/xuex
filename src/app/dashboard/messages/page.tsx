'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Send, Users, Plus, StickyNote, CheckCircle2, ListTodo } from 'lucide-react';
import { api, fmtDateTime } from '@/lib/client';
import { useUser } from '@/lib/user-context';

export default function MessagesPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<'im' | 'groups'>('im');

  /* ---------- 即时通讯 ---------- */
  const [convs, setConvs] = useState<any[]>([]);
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = () => api('/api/messages').then(setConvs).catch(() => {});
  useEffect(() => { loadConvs(); }, [user.id]);

  const openConv = async (peer: string) => {
    setActivePeer(peer);
    const rows = await api(`/api/messages?other=${peer}`).catch(() => [] as any[]);
    setMsgs(rows);
    await api(`/api/messages?other=${peer}&markRead=true`, { method: 'POST' }).catch(() => {});
    loadConvs();
  };

  const sendMsg = async () => {
    if (!draft.trim() || !activePeer) return;
    await api('/api/messages', { method: 'POST', body: { receiverId: activePeer, content: draft } }).catch(() => {});
    setDraft('');
    const rows = await api(`/api/messages?other=${activePeer}`).catch(() => [] as any[]);
    setMsgs(rows);
    loadConvs();
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  /* ---------- 学习小组 ---------- */
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [noteForm, setNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [taskForm, setTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');

  const loadGroups = () => api('/api/groups').then(setGroups).catch(() => {});
  useEffect(() => { loadGroups(); }, [user.id]);

  const openGroup = async (id: number) => {
    const d = await api(`/api/groups/${id}`).catch(() => null);
    if (d) setActiveGroup(d);
  };

  const addNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    await api(`/api/groups/${activeGroup.group.id}`, { method: 'POST', body: { kind: 'note', title: noteTitle, content: noteContent } }).catch(() => {});
    setNoteTitle(''); setNoteContent(''); setNoteForm(false);
    openGroup(activeGroup.group.id);
  };
  const addTask = async () => {
    if (!taskTitle.trim()) return;
    await api(`/api/groups/${activeGroup.group.id}`, { method: 'POST', body: { kind: 'task', title: taskTitle, assignee: taskAssignee || '未分配' } }).catch(() => {});
    setTaskTitle(''); setTaskAssignee(''); setTaskForm(false);
    openGroup(activeGroup.group.id);
  };
  const cycleTask = async (taskId: number, current: string) => {
    const next = current === 'todo' ? 'doing' : current === 'doing' ? 'done' : 'todo';
    await api(`/api/groups/${activeGroup.group.id}/tasks/${taskId}`, { method: 'PATCH', body: { status: next } }).catch(() => {});
    openGroup(activeGroup.group.id);
  };

  const peerName = activePeer ? (convs.find((c) => c.peerId === activePeer)?.peerName ?? activePeer) : '';
  const TASK_META: Record<string, { label: string; cls: string }> = {
    todo: { label: '待办', cls: 'bg-slate-100 text-slate-500' },
    doing: { label: '进行中', cls: 'bg-blue-50 text-blue-600' },
    done: { label: '已完成', cls: 'bg-leaf-50 text-leaf-600' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3"><Bell className="text-leaf-600" /> 消息中心</h2>
          <p className="text-slate-500 text-sm mt-1">师生一对一即时通讯 · 学习小组共享笔记与协作任务</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('im')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === 'im' ? 'bg-leaf-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
            即时消息
          </button>
          <button onClick={() => setTab('groups')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === 'groups' ? 'bg-leaf-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
            学习小组
          </button>
        </div>
      </div>

      {tab === 'im' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-4 h-[calc(100vh-330px)] min-h-[420px]">
          {/* 会话列表 */}
          <div className="md:col-span-1 border-r border-slate-50 overflow-y-auto">
            <div className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">会话</div>
            {convs.length === 0 && <p className="p-4 text-xs text-slate-300">暂无会话</p>}
            {convs.map((c) => (
              <button
                key={c.peerId}
                onClick={() => openConv(c.peerId)}
                className={`w-full p-4 text-left border-b border-slate-50 hover:bg-leaf-50/40 transition-colors ${activePeer === c.peerId ? 'bg-leaf-50/60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {c.peerName.slice(0, 1)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">{c.peerName}</span>
                      {c.unread > 0 && <span className="min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{c.unread}</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{c.lastMessage}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 聊天窗口 */}
          <div className="md:col-span-3 flex flex-col min-h-0">
            {!activePeer ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-300">选择左侧会话开始聊天</div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 text-white text-xs font-bold flex items-center justify-center">{peerName.slice(0, 1)}</span>
                  <span className="text-sm font-bold">{peerName}</span>
                  <span className="text-[10px] text-slate-300 font-bold">在线</span>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
                  {msgs.map((m) => {
                    const mine = m.senderId === user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3.5 rounded-2xl text-[13px] leading-relaxed ${mine ? 'bg-leaf-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                          {m.content}
                          <div className={`text-[9px] mt-1.5 ${mine ? 'text-leaf-100' : 'text-slate-300'}`}>{fmtDateTime(m.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-slate-50 flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                    placeholder="输入消息…"
                    className="flex-1 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                  />
                  <button onClick={sendMsg} className="px-5 bg-leaf-600 text-white rounded-2xl hover:bg-leaf-700"><Send size={16} /></button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 小组列表 */}
          <div className="space-y-3">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => openGroup(g.id)}
                className={`w-full text-left p-5 rounded-3xl border transition-all ${activeGroup?.group.id === g.id ? 'bg-leaf-600 text-white shadow-lg shadow-leaf-200' : 'bg-white border-slate-100 hover:border-leaf-200'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeGroup?.group.id === g.id ? 'bg-white/20' : 'bg-leaf-50 text-leaf-600'}`}>
                    <Users size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold truncate ${activeGroup?.group.id === g.id ? '' : 'text-slate-800'}`}>{g.name}</div>
                    <div className={`text-[11px] ${activeGroup?.group.id === g.id ? 'text-leaf-100' : 'text-slate-400'}`}>
                      {g.memberCount} 人 · 群主 {g.ownerName}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 小组详情 */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 min-h-[420px]">
            {!activeGroup ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-300">选择一个学习小组</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-1">{activeGroup.group.name}</h3>
                  <p className="text-xs text-slate-400">{activeGroup.group.description}</p>
                  {activeGroup.group.notice && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-2xl text-xs text-amber-700 font-medium">📢 群公告：{activeGroup.group.notice}</div>
                  )}
                </div>

                {/* 共享笔记 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold flex items-center gap-2"><StickyNote size={15} className="text-amber-500" /> 共享笔记（{activeGroup.notes.length}）</h4>
                    <button onClick={() => setNoteForm((s) => !s)} className="text-[11px] font-bold text-leaf-600 flex items-center gap-1"><Plus size={12} /> 新建笔记</button>
                  </div>
                  {noteForm && (
                    <div className="space-y-2 mb-4 p-4 bg-amber-50/40 rounded-2xl">
                      <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="笔记标题" className="w-full p-2.5 bg-white border border-amber-100 rounded-xl text-xs focus:outline-none" />
                      <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="笔记内容…" className="w-full h-16 p-2.5 bg-white border border-amber-100 rounded-xl text-xs focus:outline-none resize-none" />
                      <button onClick={addNote} className="px-4 py-1.5 bg-amber-500 text-white text-[11px] font-bold rounded-lg">保存</button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {activeGroup.notes.map((n: any) => (
                      <div key={n.id} className="p-3.5 bg-amber-50/50 border border-amber-100/60 rounded-2xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-700">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.authorName} · {fmtDateTime(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{n.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 协作任务 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold flex items-center gap-2"><ListTodo size={15} className="text-blue-500" /> 协作任务（{activeGroup.tasks.length}）</h4>
                    <button onClick={() => setTaskForm((s) => !s)} className="text-[11px] font-bold text-leaf-600 flex items-center gap-1"><Plus size={12} /> 新建任务</button>
                  </div>
                  {taskForm && (
                    <div className="space-y-2 mb-4 p-4 bg-blue-50/40 rounded-2xl">
                      <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="任务描述" className="w-full p-2.5 bg-white border border-blue-100 rounded-xl text-xs focus:outline-none" />
                      <input value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="负责人（可选）" className="w-full p-2.5 bg-white border border-blue-100 rounded-xl text-xs focus:outline-none" />
                      <button onClick={addTask} className="px-4 py-1.5 bg-blue-500 text-white text-[11px] font-bold rounded-lg">保存</button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {activeGroup.tasks.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 p-3.5 bg-slate-50/60 rounded-2xl">
                        <button onClick={() => cycleTask(t.id, t.status)} title="点击流转状态">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${TASK_META[t.status].cls}`}>{TASK_META[t.status].label}</span>
                        </button>
                        <span className={`flex-1 text-xs font-medium ${t.status === 'done' ? 'line-through text-slate-300' : 'text-slate-700'}`}>{t.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{t.assignee}</span>
                        {t.dueDate && <span className="text-[10px] text-slate-300">截止 {t.dueDate}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
