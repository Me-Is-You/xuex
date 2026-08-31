'use client';

import React, { useState } from 'react';
import { 
  Network, 
  Search, 
  Info, 
  Zap,
  Target,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const GRAPH_DATA = {
  nodes: [
    { id: 'math', label: '高等数学', x: 400, y: 300, size: 80, color: '#059669' },
    { id: 'limit', label: '极限理论', x: 250, y: 150, size: 60, color: '#10b981', parent: 'math' },
    { id: 'derivative', label: '导数与微分', x: 550, y: 150, size: 60, color: '#10b981', parent: 'math' },
    { id: 'integral', label: '一元积分', x: 600, y: 400, size: 60, color: '#10b981', parent: 'math' },
    { id: 'linear', label: '线性代数', x: 200, y: 450, size: 70, color: '#0d9488' },
    { id: 'matrix', label: '矩阵运算', x: 100, y: 550, size: 50, color: '#14b8a6', parent: 'linear' },
  ],
  links: [
    { source: 'math', target: 'limit' },
    { source: 'math', target: 'derivative' },
    { source: 'math', target: 'integral' },
    { source: 'math', target: 'linear' },
    { source: 'linear', target: 'matrix' },
    { source: 'derivative', target: 'integral' }, // Related
  ]
};

export default function KnowledgeGraphPage() {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col lg:flex-row gap-8">
      {/* Sidebar Info */}
      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Network className="text-blue-600" />
            知识图谱导航
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            可视化探索 2027 届数学与英语知识脉络。点击节点查看前置与后继知识。
          </p>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="搜索知识点..." 
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">图谱状态</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">总节点数</span>
              <span className="font-bold">42</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">已掌握</span>
              <span className="font-bold text-emerald-600">18</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">核心考点</span>
              <span className="font-bold text-blue-600">12</span>
            </div>
          </div>
        </div>

        {selectedNode && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-600 p-6 rounded-3xl text-white shadow-lg shadow-emerald-200"
          >
            <h4 className="text-lg font-bold mb-2">{selectedNode.label}</h4>
            <p className="text-emerald-50 text-xs mb-4">
              该知识点在历年真题中出现频率极高（85%），是高等数学的基石。
            </p>
            <div className="space-y-2 mb-6 text-[11px]">
              <div className="flex items-center gap-2">
                <Target size={12} /> 前置知识：极限基础
              </div>
              <div className="flex items-center gap-2">
                <Zap size={12} /> 后续知识：多元函数微分
              </div>
            </div>
            <button className="w-full bg-white text-emerald-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
              进入专题练习 <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Graph Area */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-6 left-6 z-10">
          <div className="bg-slate-900/5 backdrop-blur-md px-4 py-2 rounded-xl flex gap-6 text-[10px] font-bold text-slate-500 uppercase">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600" /> 已掌握</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> 未解锁</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> 正在攻克</div>
          </div>
        </div>

        <svg className="w-full h-full cursor-grab active:cursor-grabbing" viewBox="0 0 800 600">
          {/* Links */}
          {GRAPH_DATA.links.map((link, i) => {
            const source = GRAPH_DATA.nodes.find(n => n.id === link.source)!;
            const target = GRAPH_DATA.nodes.find(n => n.id === link.target)!;
            return (
              <line 
                key={i} 
                x1={source.x} y1={source.y} 
                x2={target.x} y2={target.y} 
                stroke="#e2e8f0" 
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Nodes */}
          {GRAPH_DATA.nodes.map((node) => (
            <g 
              key={node.id} 
              className="cursor-pointer" 
              onClick={() => setSelectedNode(node)}
            >
              <circle 
                cx={node.x} cy={node.y} r={node.size / 2} 
                fill={selectedNode?.id === node.id ? node.color : 'white'} 
                stroke={node.color}
                strokeWidth="3"
                className="transition-all duration-300"
              />
              <text 
                x={node.x} y={node.y + (node.size / 2) + 20} 
                textAnchor="middle" 
                className={`text-[12px] font-bold ${selectedNode?.id === node.id ? 'fill-blue-600' : 'fill-slate-500'}`}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="absolute bottom-6 right-6">
          <div className="flex flex-col gap-2">
            <button className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50">+</button>
            <button className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50">-</button>
          </div>
        </div>
      </div>
    </div>
  );
}
