'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Network, Plus, Trash2, Search, ArrowRight, Target, Zap, GitBranch, Pencil, Check } from 'lucide-react';
import Link from 'next/link';
import { api, KP_STATUS, SUBJECT_LABEL } from '@/lib/client';

type Node = {
  id: number; subject: string; name: string; description: string | null;
  parentId: number | null; importance: number; examFreq: number;
  mastery: number; status: string; total: number; x?: number; y?: number;
};
type Edge = { id: number; sourceId: number; targetId: number; relation: string };

// 简单径向布局：按 subject 分区 + 树形层级
function layout(nodes: Node[]) {
  const bySubject = new Map<string, Node[]>();
  nodes.forEach((n) => {
    if (!bySubject.has(n.subject)) bySubject.set(n.subject, []);
    bySubject.get(n.subject)!.push(n);
  });
  const subjects = [...bySubject.keys()];
  const pos: Record<number, { x: number; y: number }> = {};
  subjects.forEach((sub, si) => {
    const group = bySubject.get(sub)!;
    const roots = group.filter((n) => !n.parentId || !group.some((g) => g.id === n.parentId));
    const cx = 200 + si * 420;
    roots.forEach((root, ri) => {
      const angle = (ri / Math.max(1, roots.length)) * Math.PI * 2 - Math.PI / 2;
      pos[root.id] = { x: cx + Math.cos(angle) * 90, y: 170 + Math.sin(angle) * 90 };
      const children = group.filter((n) => n.parentId === root.id);
      children.forEach((c, ci) => {
        const a = angle + ((ci - (children.length - 1) / 2) * 0.7);
        pos[c.id] = { x: cx + Math.cos(a) * 190, y: 170 + Math.sin(a) * 190 };
      });
    });
    // 无父节点的孤儿
    group.filter((n) => !pos[n.id]).forEach((n, i) => {
      pos[n.id] = { x: cx - 80 + i * 80, y: 330 };
    });
  });
  return pos;
}

export default function GraphPageWrapper() {
  return (
    <Suspense fallback={null}>
      <GraphPage />
    </Suspense>
  );
}

function GraphPage() {
  const searchParams = useSearchParams();
  const focusId = Number(searchParams.get('focus')) || null;
  const [tab, setTab] = useState<'view' | 'path' | 'editor'>('view');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [notice, setNotice] = useState('');

  // 编辑器表单
  const [newKp, setNewKp] = useState({ name: '', subject: 'Math', description: '' });
  const [newEdge, setNewEdge] = useState({ sourceId: '', targetId: '', relation: 'prerequisite' });

  const load = () => {
    api(`/api/knowledge-graph${subject ? `?subject=${subject}` : ''}`)
      .then((d) => {
        setNodes(d.nodes);
        setEdges(d.edges);
      })
      .catch(() => {});
  };
  useEffect(() => { load(); }, [subject]);
  useEffect(() => {
    if (focusId) {
      api('/api/knowledge-graph').then((d) => {
        const n = d.nodes.find((x: Node) => x.id === focusId);
        if (n) { setNodes(d.nodes); setEdges(d.edges); setSelected(n); }
      }).catch(() => {});
    }
  }, [focusId]);

  const pos = useMemo(() => layout(nodes), [nodes]);
  const visible = nodes.filter((n) => !query || n.name.includes(query) || (n.description ?? '').includes(query));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const rel = (kpId: number) => {
    const prereq = edges.filter((e) => e.targetId === kpId && e.relation === 'prerequisite').map((e) => nodeMap.get(e.sourceId)).filter(Boolean) as Node[];
    const next = edges.filter((e) => e.sourceId === kpId && e.relation === 'prerequisite').map((e) => nodeMap.get(e.targetId)).filter(Boolean) as Node[];
    const related = edges.filter((e) => e.relation === 'related' && (e.sourceId === kpId || e.targetId === kpId)).map((e) => nodeMap.get(e.sourceId === kpId ? e.targetId : e.sourceId)).filter(Boolean) as Node[];
    return { prereq, next, related };
  };

  const stats = useMemo(() => {
    const mastered = nodes.filter((n) => n.status === 'mastered').length;
    const weak = nodes.filter((n) => n.status === 'weak').length;
    return { total: nodes.length, mastered, weak, edges: edges.length };
  }, [nodes, edges]);

  // 学习路径：前置未掌握 → 当前 → 后续（拓扑顺序推荐）
  const path = useMemo(() => {
    const ordered: Node[] = [];
    const visited = new Set<number>();
    const add = (n: Node) => {
      if (!n || visited.has(n.id)) return;
      visited.add(n.id);
      ordered.push(n);
    };
    // 从薄弱点/未掌握点出发，先补前置
    const targets = nodes.filter((n) => n.status === 'weak' || n.status === 'untouched');
    for (const t of targets) {
      const chain: Node[] = [];
      let cur: Node | undefined = t;
      while (cur) {
        const p = edges.find((e) => e.targetId === cur!.id && e.relation === 'prerequisite');
        if (!p) break;
        chain.unshift(nodeMap.get(p.sourceId) as Node);
        cur = nodeMap.get(p.sourceId);
      }
      chain.forEach(add);
      add(t);
    }
    nodes.filter((n) => n.status === 'learning' && !visited.has(n.id)).forEach(add);
    return ordered.slice(0, 12);
  }, [nodes, edges]);

  const doAddNode = async () => {
    if (!newKp.name.trim()) return;
    const row = await api('/api/knowledge-graph', { method: 'POST', body: newKp }).catch((e) => setNotice(e.message));
    if (row) { setNewKp({ name: '', subject: 'Math', description: '' }); setNotice(''); load(); }
  };
  const doDelNode = async (id: number) => {
    await api(`/api/knowledge-graph/nodes/${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };
  const doAddEdge = async () => {
    if (!newEdge.sourceId || !newEdge.targetId) return;
    await api('/api/knowledge-graph/edges', { method: 'POST', body: { sourceId: Number(newEdge.sourceId), targetId: Number(newEdge.targetId), relation: newEdge.relation } }).catch((e) => setNotice(e.message));
    setNewEdge({ sourceId: '', targetId: '', relation: 'prerequisite' });
    load();
  };
  const doDelEdge = async (id: number) => {
    await api(`/api/knowledge-graph/edges?edgeId=${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };

  const selRel = selected ? rel(selected.id) : null;
  const width = subject === 'Math' || subject === '' ? 800 : 400;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Network className="text-leaf-600" /> 知识图谱
          </h2>
          <p className="text-slate-500 text-sm mt-1">学科知识结构可视化 · 掌握度着色 · 学习路径导航 · 可视化编辑器</p>
        </div>
        <div className="flex gap-2">
          {([['view', '图谱视图'], ['path', '学习路径'], ['editor', '编辑器']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === t ? 'bg-leaf-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
              {t === 'view' && <Network size={12} className="inline mr-1" />}{t === 'path' && <GitBranch size={12} className="inline mr-1" />}{t === 'editor' && <Pencil size={12} className="inline mr-1" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'view' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧信息 */}
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索知识点…" className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-leaf-500" />
              </div>
              <div className="flex gap-1.5 mb-4">
                {['', 'Math', 'English'].map((s) => (
                  <button key={s} onClick={() => setSubject(s)} className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold ${subject === s ? 'bg-leaf-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                    {s === '' ? '全部' : SUBJECT_LABEL[s]}
                  </button>
                ))}
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">知识点总数</span><span className="font-bold">{stats.total}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: KP_STATUS.mastered.color }} /> 已掌握</span><span className="font-bold text-leaf-600">{stats.mastered}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: KP_STATUS.weak.color }} /> 薄弱点</span><span className="font-bold text-orange-500">{stats.weak}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">关系边</span><span className="font-bold">{stats.edges}</span></div>
              </div>
            </div>

            {selected && selRel && (
              <div className="bg-leaf-600 p-5 rounded-3xl text-white shadow-lg shadow-leaf-200">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold">{selected.name}</h4>
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{KP_STATUS[selected.status].label} {selected.mastery}%</span>
                </div>
                <p className="text-[11px] text-leaf-50/90 mb-4">{selected.description || '暂无描述'} · 重要度 {'★'.repeat(selected.importance)} · 真题率 {selected.examFreq}%</p>
                <div className="space-y-2 text-[11px] mb-4">
                  <div>📌 前置：{selRel.prereq.map((k) => k.name).join('、') || '无'}</div>
                  <div>⏭️ 后续：{selRel.next.map((k) => k.name).join('、') || '无'}</div>
                  <div>🔗 相关：{selRel.related.map((k) => k.name).join('、') || '无'}</div>
                </div>
                <Link href="/dashboard/practice" className="block w-full bg-white text-leaf-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-leaf-50">
                  进入专题练习 <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* 图谱画布 */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10 flex gap-4">
              {Object.entries(KP_STATUS).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50/80 backdrop-blur px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full" style={{ background: v.color }} /> {v.label}
                </span>
              ))}
            </div>
            <svg viewBox={`0 0 ${width} 380`} className="w-full h-[480px]">
              {/* 边 */}
              {edges.map((e) => {
                const s = pos[e.sourceId];
                const t = pos[e.targetId];
                if (!s || !t) return null;
                return (
                  <g key={e.id}>
                    <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={e.relation === 'related' ? '#fcd34d' : '#cbd5e1'} strokeWidth="2" strokeDasharray={e.relation === 'related' ? '5 4' : 'none'} markerEnd="url(#arrow)" />
                  </g>
                );
              })}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>
              {/* 节点 */}
              {visible.map((n) => {
                const p = pos[n.id];
                if (!p) return null;
                const r = 16 + n.importance * 3;
                const color = KP_STATUS[n.status].color;
                const dim = query && !n.name.includes(query) && !(n.description ?? '').includes(query);
                return (
                  <g key={n.id} className="cursor-pointer" opacity={dim ? 0.3 : 1} onClick={() => setSelected(n)}>
                    <circle cx={p.x} cy={p.y} r={r + 4} fill={color} opacity={selected?.id === n.id ? 0.25 : 0.08} />
                    <circle cx={p.x} cy={p.y} r={r} fill={selected?.id === n.id ? color : 'white'} stroke={color} strokeWidth="2.5" className="transition-all" />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" className="text-[10px] font-bold" fill={selected?.id === n.id ? 'white' : '#334155'}>
                      {n.mastery > 0 ? `${n.mastery}%` : ''}
                    </text>
                    <text x={p.x} y={p.y + r + 14} textAnchor="middle" className="text-[11px] font-bold" fill={selected?.id === n.id ? '#3a754e' : '#475569'}>
                      {n.name}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="absolute bottom-4 right-4 text-[10px] text-slate-300 font-bold">实线=前置依赖 · 虚线=相关扩展 · 点击节点查看关联</div>
          </div>
        </div>
      )}

      {tab === 'path' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm max-w-3xl">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Target className="text-leaf-600" /> 推荐学习路径</h3>
          <p className="text-xs text-slate-400 mb-8">基于知识图谱拓扑排序：先补前置薄弱项，再推进后续知识点（当前学习位置：{nodes.filter((n) => n.status === 'learning').map((n) => n.name).slice(0, 3).join('、') || '—'}）</p>
          <div className="space-y-0">
            {path.map((n, i) => (
              <div key={n.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: KP_STATUS[n.status].color }}>
                    {i + 1}
                  </div>
                  {i < path.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1" />}
                </div>
                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{n.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: KP_STATUS[n.status].bg, color: KP_STATUS[n.status].color }}>
                      {KP_STATUS[n.status].label}
                    </span>
                    <span className="text-[10px] text-slate-400">{SUBJECT_LABEL[n.subject]} · 重要度 {'★'.repeat(n.importance)} · 真题率 {n.examFreq}%</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{n.description}</p>
                  <Link href="/dashboard/practice" className="inline-flex items-center gap-1 text-[11px] font-bold text-leaf-600 mt-1.5 hover:underline">
                    <Zap size={11} /> 开始攻克 <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            ))}
            {path.length === 0 && <p className="text-sm text-slate-300">当前无待攻克知识点 🎉</p>}
          </div>
        </div>
      )}

      {tab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 节点管理 */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold mb-4">知识点节点</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={newKp.name} onChange={(e) => setNewKp({ ...newKp, name: e.target.value })} placeholder="知识点名称" className="p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100 focus:outline-none focus:ring-2 focus:ring-leaf-500" />
              <select value={newKp.subject} onChange={(e) => setNewKp({ ...newKp, subject: e.target.value })} className="p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                <option value="Math">数学</option>
                <option value="English">英语</option>
              </select>
            </div>
            <input value={newKp.description} onChange={(e) => setNewKp({ ...newKp, description: e.target.value })} placeholder="描述（可选）" className="w-full p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100 focus:outline-none focus:ring-2 focus:ring-leaf-500 mb-3" />
            <button onClick={doAddNode} className="w-full flex items-center justify-center gap-1.5 bg-leaf-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-leaf-700">
              <Plus size={14} /> 新增知识点
            </button>
            {notice && <p className="text-[11px] font-bold text-red-500 mt-2">{notice}</p>}
            <div className="mt-5 space-y-2 max-h-80 overflow-y-auto">
              {nodes.map((n) => (
                <div key={n.id} className="flex items-center gap-2 p-2.5 bg-slate-50/60 rounded-xl">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: KP_STATUS[n.status].color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{n.name}</div>
                    <div className="text-[10px] text-slate-400">{SUBJECT_LABEL[n.subject]} · 掌握 {n.mastery}%</div>
                  </div>
                  <button onClick={() => doDelNode(n.id)} className="p-1.5 text-slate-300 hover:text-red-500" title="删除节点及关联边">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 关系管理 */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold mb-4">知识点关系（有向边）</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={newEdge.sourceId} onChange={(e) => setNewEdge({ ...newEdge, sourceId: e.target.value })} className="p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                <option value="">前置知识点…</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
              <select value={newEdge.targetId} onChange={(e) => setNewEdge({ ...newEdge, targetId: e.target.value })} className="p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                <option value="">目标知识点…</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <select value={newEdge.relation} onChange={(e) => setNewEdge({ ...newEdge, relation: e.target.value })} className="w-full p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100 mb-3">
              <option value="prerequisite">prerequisite（前置依赖）</option>
              <option value="related">related（相关扩展）</option>
            </select>
            <button onClick={doAddEdge} className="w-full flex items-center justify-center gap-1.5 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800">
              <Plus size={14} /> 建立关系（前置 → 目标）
            </button>
            <div className="mt-5 space-y-2 max-h-80 overflow-y-auto">
              {edges.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2.5 bg-slate-50/60 rounded-xl text-xs">
                  <span className="font-bold">{nodeMap.get(e.sourceId)?.name ?? '?'}</span>
                  <ArrowRight size={12} className="text-slate-300" />
                  <span className="font-bold">{nodeMap.get(e.targetId)?.name ?? '?'}</span>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${e.relation === 'related' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    {e.relation === 'related' ? '相关' : '前置'}
                  </span>
                  <button onClick={() => doDelEdge(e.id)} className="p-1 text-slate-300 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
