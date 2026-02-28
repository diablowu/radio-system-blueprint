import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    Connection,
    Node,
    Edge,
    ReactFlowInstance,
    NodeTypes,
    EdgeTypes,
    ConnectionMode,
} from '@xyflow/react';
import { COMPONENT_MAP, PORT_TYPE_COLORS as _PORT_TYPE_COLORS, PORT_TYPE_LABELS as _PORT_TYPE_LABELS, getComponentPorts, PortType } from './registry/componentRegistry';
import '@xyflow/react/dist/style.css';

import { v4 as uuidv4 } from 'uuid';
import RadioNode, { RadioNodeData } from './nodes/RadioNode';
import RadioEdge, { RadioEdgeData } from './nodes/RadioEdge';
import ComponentToolbar from './components/ComponentToolbar';
import TopToolbar from './components/TopToolbar';
import EdgeConfigPanel from './components/EdgeConfigPanel';

import './index.css';

// 网格步长（像素）
const GRID_SIZE = 20;

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
    radioNode: RadioNode,
};

// 注册自定义边类型
const edgeTypes: EdgeTypes = {
    radioEdge: RadioEdge,
};

// 初始空数据
const emptyNodes: Node[] = [];
const emptyEdges: Edge[] = [];

function BlueprintCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(emptyNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(emptyEdges);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [selectedEdgeType, setSelectedEdgeType] = useState<PortType>('coax');
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
    const [toolbarCollapsed, setToolbarCollapsed] = useState<boolean>(false);

    // 处理连线创建
    const onConnect = useCallback(
        (params: Connection) => {
            const newEdge: Edge = {
                ...params,
                id: uuidv4(),
                type: 'radioEdge',
                data: { edgeType: selectedEdgeType } as unknown as RadioEdgeData,
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [selectedEdgeType, setEdges]
    );

    // 校验连线合法性：端口类型必须一致
    const isValidConnection = useCallback(
        (connection: Edge | Connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);
            if (!sourceNode || !targetNode) return false;

            const sourceDef = COMPONENT_MAP[(sourceNode.data as unknown as RadioNodeData).componentType];
            const targetDef = COMPONENT_MAP[(targetNode.data as unknown as RadioNodeData).componentType];
            if (!sourceDef || !targetDef) return false;

            const sourcePorts = getComponentPorts(sourceDef, (sourceNode.data as unknown as RadioNodeData).config);
            const targetPorts = getComponentPorts(targetDef, (targetNode.data as unknown as RadioNodeData).config);

            const sourcePort = sourcePorts.find((p) => p.id === connection.sourceHandle);
            const targetPort = targetPorts.find((p) => p.id === connection.targetHandle);
            if (!sourcePort || !targetPort) return false;

            return sourcePort.type === targetPort.type;
        },
        [nodes]
    );

    // 拖拽开始（从工具栏）
    const onDragStart = useCallback((event: React.DragEvent, componentType: string) => {
        event.dataTransfer.setData('application/radio-component-type', componentType);
        event.dataTransfer.effectAllowed = 'move';
    }, []);

    // 拖拽悬停（允许放置）
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // 放置（创建节点）
    // 注意：screenToFlowPosition 已内置处理容器偏移，直接传 clientX/clientY 即可
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const componentType = event.dataTransfer.getData('application/radio-component-type');
            if (!componentType || !rfInstance) return;

            const def = COMPONENT_MAP[componentType];
            if (!def) return;

            // 将屏幕坐标转换为 Flow 坐标（直接传 clientX/clientY，无需减去容器偏移）
            const rawPos = rfInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // 吸附到网格
            const snappedPos = {
                x: Math.round(rawPos.x / GRID_SIZE) * GRID_SIZE,
                y: Math.round(rawPos.y / GRID_SIZE) * GRID_SIZE,
            };

            // 若组件有可配置字段，预填默认值
            const defaultConfig: Record<string, string> = {};
            for (const field of def.configFields ?? []) {
                defaultConfig[field.key] = field.defaultValue;
            }

            const newNode: Node = {
                id: uuidv4(),
                type: 'radioNode',
                position: snappedPos,
                // @xyflow/react v12 要求显式指定初始 width/height，
                // 否则首次测量结果为 0x0，节点将保持 visibility:hidden 不显示
                width: def.width,
                height: def.height,
                data: {
                    componentType,
                    label: def.name,
                    ...(Object.keys(defaultConfig).length > 0 ? { config: defaultConfig } : {}),
                } as unknown as RadioNodeData,
            };

            setNodes((nds) => [...nds, newNode]);
        },
        [rfInstance, setNodes]
    );

    // 导入 JSON
    const handleImport = useCallback(
        ({ nodes: importedNodes, edges: importedEdges }: { nodes: Node[]; edges: Edge[] }) => {
            setNodes(importedNodes);
            setEdges(importedEdges);
        },
        [setNodes, setEdges]
    );

    // 清空画布
    const handleClearAll = useCallback(() => {
        setNodes([]);
        setEdges([]);
        localStorage.removeItem('radio-blueprint-data');
    }, [setNodes, setEdges]);

    // 初始化加载
    useEffect(() => {
        const stored = localStorage.getItem('radio-blueprint-data');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
                    setNodes(data.nodes);
                    setEdges(data.edges);
                }
                if (typeof data.isDarkMode === 'boolean') {
                    setIsDarkMode(data.isDarkMode);
                }
            } catch (err) {
                console.error('无法解析本地存储的数据:', err);
            }
        }
    }, [setNodes, setEdges]);

    // 自动保存
    useEffect(() => {
        if (nodes.length > 0 || edges.length > 0) {
            const data = { nodes, edges, isDarkMode };
            localStorage.setItem('radio-blueprint-data', JSON.stringify(data));
        }
    }, [nodes, edges, isDarkMode]);

    // 防止意外刷新离开页面
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (nodes.length > 0 || edges.length > 0) {
                e.preventDefault();
                e.returnValue = ''; // 现代浏览器必须设置此空字符串触发提示
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [nodes, edges]);

    const bgColor = isDarkMode ? '#0f172a' : '#f8fafc';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const dotColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: bgColor, overflow: 'hidden' }}>
            {/* 顶部工具栏 */}
            <TopToolbar
                nodes={nodes}
                edges={edges}
                onImport={handleImport}
                onClearAll={handleClearAll}
                selectedEdgeType={selectedEdgeType}
                onEdgeTypeChange={setSelectedEdgeType}
                isDarkMode={isDarkMode}
                onThemeToggle={() => setIsDarkMode(!isDarkMode)}
            />

            {/* 主体布局 */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* 左侧组件工具栏 */}
                <ComponentToolbar
                    onDragStart={onDragStart}
                    isDarkMode={isDarkMode}
                    collapsed={toolbarCollapsed}
                    onToggleCollapse={() => setToolbarCollapsed(!toolbarCollapsed)}
                />

                {/* React Flow 画布 */}
                <div
                    ref={reactFlowWrapper}
                    style={{ flex: 1, position: 'relative' }}
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        isValidConnection={isValidConnection}
                        onInit={setRfInstance}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        snapToGrid={true}
                        snapGrid={[GRID_SIZE, GRID_SIZE]}
                        connectionMode={ConnectionMode.Loose}
                        // 全局调大对线段命中光标边缘触发框的灵敏度阈值 (增大到20px)
                        defaultEdgeOptions={{
                            type: 'radioEdge',
                            interactionWidth: 20
                        }}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.2}
                        maxZoom={3}
                        style={{ background: bgColor }}
                        deleteKeyCode={['Backspace', 'Delete']}
                        proOptions={{ hideAttribution: true }}
                    >
                        {/* 连线属性面板，当有一条边被选中时出现 */}
                        {edges.filter(e => e.selected).length === 1 && (
                            <EdgeConfigPanel
                                edge={edges.find(e => e.selected)!}
                                isDarkMode={isDarkMode}
                            />
                        )}

                        {/* 网格背景 */}
                        <Background
                            variant={BackgroundVariant.Lines}
                            gap={GRID_SIZE}
                            size={1}
                            color={gridColor}
                            style={{}}
                        />

                        {/* 辅助点网格 */}
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={GRID_SIZE * 4}
                            size={1.5}
                            color={dotColor}
                            style={{}}
                        />

                        {/* 控制器 */}
                        <Controls
                            style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
                                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                borderRadius: 8,
                            }}
                        />

                        {/* 小地图 */}
                        <MiniMap
                            style={{
                                background: isDarkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
                                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                borderRadius: 8,
                            }}
                            maskColor={isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(200,200,200,0.6)'}
                            nodeColor={(node) => {
                                const data = node.data as unknown as RadioNodeData;
                                const def = COMPONENT_MAP[data?.componentType ?? ''];
                                return def?.color ?? '#475569';
                            }}
                        />
                    </ReactFlow>

                    {/* 空画布提示 */}
                    {nodes.length === 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none',
                            userSelect: 'none',
                        }}>
                            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📡</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.15)', marginBottom: 8 }}>
                                从左侧拖入组件到画布
                            </div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.08)' }}>
                                开始设计你的无线电台站蓝图
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 图例 */}
            <Legend selectedEdgeType={selectedEdgeType} />
        </div>
    );
}

// 图例组件
function Legend({ selectedEdgeType }: { selectedEdgeType: PortType }) {
    const PORT_TYPE_COLORS = _PORT_TYPE_COLORS;
    const PORT_TYPE_LABELS = _PORT_TYPE_LABELS;
    const items: PortType[] = ['coax', 'dc', 'ptt', 'signal'];
    const lineStyles: Record<PortType, string> = {
        coax: 'solid',
        dc: 'dashed',
        ptt: 'dashed',
        signal: 'dashed',
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 120,
            right: 16,
            background: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            zIndex: 5,
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
        }}>
            <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                连线图例
            </div>
            {items.map((type) => {
                const color = PORT_TYPE_COLORS[type];
                const isActive = selectedEdgeType === type;
                return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: isActive ? 1 : 0.5 }}>
                        <div style={{
                            width: 28,
                            height: 0,
                            border: `2px ${lineStyles[type]} ${color}`,
                            borderRadius: 1,
                        }} />
                        <span style={{ fontSize: 10, color: isActive ? color : '#64748b', fontWeight: isActive ? 700 : 400 }}>
                            {PORT_TYPE_LABELS[type]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default function App() {
    return (
        <ReactFlowProvider>
            <BlueprintCanvas />
        </ReactFlowProvider>
    );
}
