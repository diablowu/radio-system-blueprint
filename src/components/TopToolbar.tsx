import React, { useState, useCallback } from 'react';
import { Edge, Node } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { PORT_TYPE_LABELS, PORT_TYPE_COLORS, PortType } from '../registry/componentRegistry';
import demoData from '../../demo.json';

interface TopToolbarProps {
    nodes: Node[];
    edges: Edge[];
    onImport: (data: { nodes: Node[]; edges: Edge[] }) => void;
    onClearAll: () => void;
    selectedEdgeType: PortType;
    onEdgeTypeChange: (type: PortType) => void;
    isDarkMode: boolean;
    onThemeToggle: () => void;
}

const EDGE_TYPES: PortType[] = ['coax', 'dc', 'ptt', 'signal'];

export default function TopToolbar({
    nodes,
    edges,
    onImport,
    onClearAll,
    selectedEdgeType,
    onEdgeTypeChange,
    isDarkMode,
    onThemeToggle,
}: TopToolbarProps) {
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sharing, setSharing] = useState(false);

    // 导出 JSON
    const handleExportJSON = useCallback(() => {
        let fileName = window.prompt("请输入要导出的蓝图名称", "radio-blueprint");
        if (!fileName) return; // 用户取消
        if (!fileName.endsWith('.json')) {
            fileName += '.json';
        }

        const data = { nodes, edges, version: '1.0', exportedAt: new Date().toISOString() };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [nodes, edges]);

    // 导出 PNG
    const handleExportPNG = useCallback(async () => {
        let fileName = window.prompt("请输入要保存的图片名称", "radio-blueprint");
        if (!fileName) return; // 用户取消
        if (!fileName.endsWith('.png')) {
            fileName += '.png';
        }

        const canvas = document.querySelector('.react-flow') as HTMLElement;
        if (!canvas) return;
        setExporting(true);
        try {
            const dataUrl = await toPng(canvas, {
                backgroundColor: '#0f172a',
                pixelRatio: 2,
                filter: (node) => {
                    // 过滤掉 React Flow 的控制按钮
                    if (node.classList?.contains('react-flow__controls')) return false;
                    if (node.classList?.contains('react-flow__minimap')) return false;
                    return true;
                },
            });
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error('PNG 导出失败:', err);
            alert('PNG 导出失败，请重试');
        } finally {
            setExporting(false);
        }
    }, []);

    // 分享到 X.com
    const handleShareX = useCallback(async () => {
        const canvas = document.querySelector('.react-flow') as HTMLElement;
        if (!canvas) return;
        setSharing(true);
        try {
            const dataUrl = await toPng(canvas, {
                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                pixelRatio: 2,
                filter: (node) => {
                    if (node.classList?.contains('react-flow__controls')) return false;
                    if (node.classList?.contains('react-flow__minimap')) return false;
                    return true;
                },
            });

            const shareText = '我用 Radio Blueprint 设计了一个无线电台站蓝图！#RadioBlueprint #HAM #无线电';

            // 优先使用 Web Share API（支持直接分享文件）
            if (typeof navigator.canShare === 'function') {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], 'radio-blueprint.png', { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Radio Blueprint', text: shareText });
                    return;
                }
            }

            // 降级：先下载图片，再打开 X 发推意图链接
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'radio-blueprint.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => {
                const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                window.open(tweetUrl, '_blank', 'noopener,noreferrer');
            }, 600);
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('分享失败:', err);
                alert('分享失败，请重试');
            }
        } finally {
            setSharing(false);
        }
    }, [isDarkMode]);

    // 导入 JSON
    const handleImportJSON = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            setImporting(true);
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
                    throw new Error('无效的蓝图文件格式');
                }
                onImport({ nodes: data.nodes, edges: data.edges });
            } catch (err) {
                alert(`导入失败: ${err instanceof Error ? err.message : '文件格式错误'}`);
            } finally {
                setImporting(false);
            }
        };
        input.click();
    }, [onImport]);

    // 加载示例
    const handleLoadDemo = useCallback(() => {
        if (window.confirm('加载示例会覆盖当前画布所有的组件和连线，确认继续吗？')) {
            onImport({
                nodes: (demoData.nodes || []) as unknown as Node[],
                edges: (demoData.edges || []) as unknown as Edge[]
            });
        }
    }, [onImport]);

    const btnBase: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        transition: 'all 0.15s ease',
        outline: 'none',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
    };

    return (
        <div style={{
            height: 52,
            background: isDarkMode ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
            flexShrink: 0,
            backdropFilter: 'blur(12px)',
            zIndex: 10,
        }}>
            {/* Logo / 标题 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
                <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                }}>
                    📡
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: isDarkMode ? '#e2e8f0' : '#1e293b', lineHeight: 1.2 }}>Radio Blueprint</div>
                    <div style={{ fontSize: 9, color: isDarkMode ? '#475569' : '#64748b', lineHeight: 1.2 }}>无线电台站设计蓝图</div>
                </div>
            </div>

            <div style={{ width: 1, height: 28, background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', margin: '0 4px' }} />

            {/* 连线类型选择器 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>连线类型:</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    {EDGE_TYPES.map((type) => {
                        const isSelected = selectedEdgeType === type;
                        const color = PORT_TYPE_COLORS[type];
                        return (
                            <button
                                key={type}
                                onClick={() => onEdgeTypeChange(type)}
                                style={{
                                    ...btnBase,
                                    padding: '4px 10px',
                                    background: isSelected ? `${color}22` : 'transparent',
                                    border: `1.5px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`,
                                    color: isSelected ? color : '#64748b',
                                    boxShadow: isSelected ? `0 0 8px ${color}44` : 'none',
                                }}
                                title={PORT_TYPE_LABELS[type]}
                            >
                                <span style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: color,
                                    display: 'inline-block',
                                    flexShrink: 0,
                                }} />
                                {PORT_TYPE_LABELS[type]}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* 右侧操作按钮 */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                    onClick={handleLoadDemo}
                    style={{
                        ...btnBase,
                        background: 'rgba(168,85,247,0.15)',
                        border: '1px solid rgba(168,85,247,0.4)',
                        color: '#d8b4fe',
                    }}
                    title="加载并覆盖当前画布的示例蓝图"
                >
                    ✨ 加载示例
                </button>

                <button
                    onClick={onThemeToggle}
                    style={{
                        ...btnBase,
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: isDarkMode ? '#fcd34d' : '#64748b',
                        padding: '6px',
                        fontSize: '16px',
                        marginRight: '8px',
                        marginLeft: '8px'
                    }}
                    title="切换深浅主题"
                >
                    {isDarkMode ? '🌙' : '☀️'}
                </button>

                <button
                    onClick={handleImportJSON}
                    disabled={importing}
                    style={{
                        ...btnBase,
                        background: 'rgba(59,130,246,0.15)',
                        border: '1px solid rgba(59,130,246,0.4)',
                        color: '#93c5fd',
                    }}
                    title="导入 JSON 蓝图文件"
                >
                    📂 导入 JSON
                </button>

                <button
                    onClick={handleExportJSON}
                    style={{
                        ...btnBase,
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.4)',
                        color: '#6ee7b7',
                    }}
                    title="导出 JSON 蓝图定义"
                >
                    💾 导出 JSON
                </button>

                <button
                    onClick={handleExportPNG}
                    disabled={exporting}
                    style={{
                        ...btnBase,
                        background: 'rgba(245,158,11,0.15)',
                        border: '1px solid rgba(245,158,11,0.4)',
                        color: '#fcd34d',
                    }}
                    title="导出 PNG 图片"
                >
                    🖼️ {exporting ? '导出中...' : '导出 PNG'}
                </button>

                <button
                    onClick={handleShareX}
                    disabled={sharing}
                    style={{
                        ...btnBase,
                        background: sharing ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#ffffff',
                    }}
                    title="截图并分享到 X.com（不支持 Web Share API 时自动下载图片）"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    {sharing ? '生成中...' : '分享到 X'}
                </button>

                <button
                    onClick={() => {
                        if (window.confirm('确认清空所有组件和连线吗？')) {
                            onClearAll();
                        }
                    }}
                    style={{
                        ...btnBase,
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5',
                    }}
                    title="清空画布"
                >
                    🗑️ 清空
                </button>
            </div>
        </div>
    );
}
