# AGENTS.md - Radio Blueprint 研发协作手册

本文件是 Radio Blueprint 项目的 AI 协作与架构规范文档（遵循 `agents.md` 理念）。它的目的是为当前及未来的开发提供唯一的“共识之源”（Single Source of Truth），涵盖架构设计、组件约定、数据结构和业务逻辑。

---

## � 1. 项目愿景与边界 (Vision & Scope)
- **项目名称**: Radio Blueprint (无线电台站设计蓝图)
- **核心目标**: 构建一个高度交互、专业且美观的基于 Web 的无线电链路仿真可视化设计器。帮助无线电工程师和业余无线电爱好者（HAM）快速构思、设计和验证射频及控制系统拓扑。
- **技术栈**: React 18, @xyflow/react (React Flow), TypeScript, Vite (假设), Vanilla CSS。
- **非目标 (Non-Goals)**: 目前不涉及后端的实际射频物理仿真计算，重点完全在于拓扑连接、视图层面的逻辑校验和快速排版。

---

## 🏗️ 2. 系统架构思路 (Architecture)

### 2.1 核心画布层 (Canvas)
采用 React Flow 作为渲染底座，完全禁用其默认的黑色外观，接管所有的样式（由 `isDarkMode` 状态控制全局明暗）。画布开启了严格的网格对齐（无缝吸附），支持无限缩放和漫游。

### 2.2 数据存储与状态 (State & Persistence)
- **单一真相源**: `nodes` 和 `edges` 数组是画布的核心数据结构。
- **持久化方案**: 利用 `useEffect` 侦听状态变化，实时全量写入 `localStorage ('radio-blueprint-data')`。
- **主题化**: `isDarkMode` 被提升至 `App.tsx` 顶层，并序列化到本地存储中，向下以 Props 形式贯穿传递给 Toolbar 和控制栏。

### 2.3 自定义渲染管线 (Custom Renderers)
- **节点视图 (`RadioNode.tsx`)**: 
  - 弃用默认矩形节点。
  - 内置基于 SVG 和纯 CSS 的渐变面板结构。
  - 支持 `360` 度的 UI 旋转矩阵，但为了保证连线正确，内部的 React Flow `Handle` (连线锚点) 会动态补全反向旋转抵消计算。
- **边线控制 (`RadioEdge.tsx`)**:
  - 全面弃用内置的贝塞尔或平滑折线。
  - 实现基于 SVG Path 的“正交布线”（Orthogonal Routing）：同轴走平-竖-平，天线走竖-平-竖。
  - **创新点**：在路径中点挂载 `DraggableEdgeAnchor.tsx`（拖拽手柄），直接修改连线自身的 `data.dragOffset`，实现可响应式的防干涉手动避让。

---

## 🔌 3. 数据模型设计 (Data Models)

### 3.1 端口注册策略 (Component Registry)
组件库并未采用硬编码，而是通过抽象的词典机制（`COMPONENT_REGISTRY`）进行管理：
```typescript
interface ComponentDefinition {
    type: string;             // 全局唯一标识符 (例如: 'power-divider')
    category: Category;       // 组件分类 ('transceiver', 'passive', 'accessory')
    ports: PortDefinition[] | ((config: any) => PortDefinition[]); // 支持高阶函数，根据 UI 的配置表单动态生成接口（如：功分器 1分2/4/8）
    // ...UI 元数据 (尺寸, 颜色, 图标)
}
```

### 3.2 端口与链路类型限定 (Port Typed Validation)
- `'coax'` (射频同轴线 - 橙红/橙黄渐变)
- `'dc'` (直流电源线 - 红色)
- `'ptt'` (控制信号线 - 蓝色)
- `'signal'` (通用数据/音频线 - 紫色)
**校验规则**: `<ReactFlow isValidConnection>` 拦截跨端口类型的胡乱连接，避免电源接射频口等逻辑错误。

---

## ⚖️ 4. 架构决策纪录 (ADR: Architecture Decision Records)

### ADR-001: 抛弃 SVG 曲线，强制正交矩形连线
- **日期**: 2026-02-26
- **背景**: 传统的贝塞尔曲线难以表达工业布线、射频线缆与机柜间的真实走向。
- **决策**: 开发原生适配正交走线的 Edge 组件，支持连线拖拽手柄注入。
- **结果**: 增强了图纸的工程感和严谨度。

### ADR-002: UI 级的动态组件端口生成
- **背景**: 如功分器等器件，需要改变分支头数量。若每种数量都独立作为一个组件注册，会导致工具栏极度臃肿。
- **决策**: 在 `RadioNode` 内预留 config 结构，将端口推导为 `(config) => Ports`。一旦修改节点参数，立刻引发 Handles 重绘。

### ADR-003: 工具栏无缝折叠逻辑
- **背景**: 侧边工具栏过宽，在复杂设计中占用宝贵的画布像素。
- **决策**: 不采用彻底 `unmount` 的方式，而是利用 CSS `width` 的 Transition 和 `isToolbarCollapsed` 控制，确保布局平滑，增强 UX。

---

## 📝 5. 开发协同列表 (Task Backlog)

### 🟢 阶段一: 核心链路闭环 (已完成)
- [x] 组件拖拽上板，网格捕捉。
- [x] 设备注册表完善 (包含收发信机、功分、耦合、天线、假负载、GPSDO 等 8 种核心器件)。
- [x] 端口合法性校验与可视化高亮。
- [x] 正交走线、连线中间点手动拖拽功能。
- [x] 本地 LocalStorage 无缝数据/主题缓存。
- [x] 画布明/暗色全局主题支持，包括背景网络和外边框。
- [x] JSON/PNG 双模式离线数据落盘与读取。

### 🟡 阶段二: 高级交互调优 (筹备/进行中)
- [ ] **多选与组合**: 允许多个节点打组合并移动（Grouping）。
- [ ] **连线节点对齐**: 在拖拽锚点时加入简单的磁吸(Snap)功能。
- [ ] **Touch 适配**: 针对手机或 iPad 屏幕的 Pinch/Zoom 操作专门优化 `DraggableEdgeAnchor` 的响应。

### 🔴 阶段三: 业务功能扩展 (积压)
- [ ] **阻抗与损耗核算**: 为连线赋予长度参数，基于 RG58/RG213 计算损耗并在图中标注。
- [ ] **一键排版**: 引入 `dagre.js` 等自动排布图纸上混乱的流向。
- [ ] **撤销重做栈**: 支持 Undo/Redo，避免失误。

---

## 🤖 6. AI 行为准则 (Prompt Guidelines for Agent)
本节定义 AI 在面对代码修改时的绝对原则：
1. **简单即美 (KISS)**: 对组件状态尽量下沉到最末端管理。避免引入 Redux 等全局巨无霸状态库。
2. **渐进式设计**: 凡是涉及新功能的提交，优先验证无语法错误（`npx tsc`），不破坏现有 UI，且兼容暗/亮色主题。
3. **原生 CSS 偏好**: 样式优先编写在 `style={{}}` 行内或 `index.css`。禁用 Tailwind、Styled-Components unless absolutely necessary。
4. **所有说明和中文回复**: `Implementation Plan, Task List and Thought in Chinese`。
