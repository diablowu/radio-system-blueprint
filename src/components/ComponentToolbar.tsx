import React, { useState, useCallback } from 'react';
import {
    COMPONENTS_BY_CATEGORY,
    COMPONENT_REGISTRY,
    CATEGORY_LABELS,
    ComponentCategory,
    ComponentDefinition,
    PORT_TYPE_LABELS,
    PORT_TYPE_COLORS,
    getComponentPorts,
} from '../registry/componentRegistry';

interface ComponentToolbarProps {
    onDragStart: (event: React.DragEvent, componentType: string) => void;
    isDarkMode?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

function PortBadge({ type, label }: { type: string; label: string }) {
    const color = PORT_TYPE_COLORS[type as keyof typeof PORT_TYPE_COLORS] ?? '#888';
    return (
        <span style={{
            display: 'inline-block',
            padding: '1px 5px',
            borderRadius: 3,
            fontSize: 9,
            fontWeight: 600,
            color,
            border: `1px solid ${color}`,
            marginRight: 3,
            marginBottom: 2,
            background: `${color}18`,
        }}>
            {label}
        </span>
    );
}

function ComponentCard({
    def,
    onDragStart,
    isDarkMode = true,
}: {
    def: ComponentDefinition;
    onDragStart: (event: React.DragEvent, componentType: string) => void;
    isDarkMode?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, def.type)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setShowDetail(false); }}
            style={{
                background: hovered ? def.bgColor : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                border: `1.5px solid ${hovered ? def.borderColor : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
                borderRadius: 8,
                padding: '10px 12px',
                cursor: 'grab',
                transition: 'all 0.15s ease',
                position: 'relative',
                boxShadow: hovered ? `0 2px 12px ${def.color}33` : 'none',
                userSelect: 'none',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{def.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                        {def.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {def.description}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); setShowDetail(!showDetail); }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '2px 4px',
                        borderRadius: 4,
                        lineHeight: 1,
                        flexShrink: 0,
                    }}
                    title="查看接口详情"
                >
                    ⓘ
                </button>
            </div>

            {/* 展开接口详情 */}
            {showDetail && (
                <div style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 10,
                    color: '#94a3b8',
                }}>
                    <div style={{ marginBottom: 4, fontWeight: 600, color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>
                        接口列表
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {getComponentPorts(def).map((port) => (
                            <PortBadge key={port.id} type={port.type} label={`${port.label}(${PORT_TYPE_LABELS[port.type]})`} />
                        ))}
                    </div>
                </div>
            )}

            {/* 拖拽提示 */}
            {hovered && !showDetail && (
                <div style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 8,
                    fontSize: 9,
                    color: def.color,
                    opacity: 0.7,
                }}>
                    拖入画布 →
                </div>
            )}
        </div>
    );
}

export default function ComponentToolbar({
    onDragStart,
    isDarkMode = true,
    collapsed: isToolbarCollapsed = false,
    onToggleCollapse
}: ComponentToolbarProps) {
    const [collapsed, setCollapsed] = useState<Partial<Record<ComponentCategory, boolean>>>({});
    const [search, setSearch] = useState('');

    const toggleCategory = useCallback((cat: ComponentCategory) => {
        setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
    }, []);

    const filteredComponents = search.trim()
        ? COMPONENT_REGISTRY.filter(
            (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.description.toLowerCase().includes(search.toLowerCase())
        )
        : null;

    return (
        <div style={{
            width: isToolbarCollapsed ? 48 : 240,
            height: '100%',
            background: isDarkMode ? 'rgba(15,23,42,0.95)' : 'rgba(248,250,252,0.95)',
            borderRight: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
        }}>
            {/* 折叠切换按钮 */}
            <button
                onClick={onToggleCollapse}
                style={{
                    position: 'absolute',
                    right: isToolbarCollapsed ? '50%' : 10,
                    top: 16,
                    transform: isToolbarCollapsed ? 'translateX(50%)' : 'none',
                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: 4,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    zIndex: 20,
                    transition: 'all 0.2s',
                }}
                title={isToolbarCollapsed ? "展开工具栏" : "折叠工具栏"}
            >
                {isToolbarCollapsed ? '»' : '«'}
            </button>
            {/* 标题 */}
            {!isToolbarCollapsed && (
                <>
                    <div style={{
                        padding: '16px 16px 12px',
                        borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        flexShrink: 0,
                    }}>
                        <div style={{ fontSize: 11, color: isDarkMode ? '#475569' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600, paddingRight: 30 }}>
                            组件工具栏
                        </div>
                        {/* 搜索框 */}
                        <input
                            type="text"
                            placeholder="搜索组件..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                borderRadius: 6,
                                padding: '6px 10px',
                                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                fontSize: 12,
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* 组件列表 */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
                        {filteredComponents ? (
                            /* 搜索模式 */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {filteredComponents.length === 0 ? (
                                    <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>
                                        未找到匹配组件
                                    </div>
                                ) : (
                                    filteredComponents.map((def) => (
                                        <ComponentCard key={def.type} def={def} onDragStart={onDragStart} />
                                    ))
                                )}
                            </div>
                        ) : (
                            /* 分类模式 */
                            (Object.keys(CATEGORY_LABELS) as ComponentCategory[]).map((cat) => {
                                const items = COMPONENTS_BY_CATEGORY[cat];
                                if (!items?.length) return null;
                                const isCollapsed = !!collapsed[cat];

                                return (
                                    <div key={cat} style={{ marginBottom: 10 }}>
                                        {/* 分类标题 */}
                                        <button
                                            onClick={() => toggleCategory(cat)}
                                            style={{
                                                width: '100%',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '6px 4px',
                                                color: '#64748b',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                borderRadius: 4,
                                            }}
                                        >
                                            <span>{CATEGORY_LABELS[cat]}</span>
                                            <span style={{ transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : '' }}>▼</span>
                                        </button>

                                        {/* 组件卡片列表 */}
                                        {!isCollapsed && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                                                {items.map((def) => (
                                                    <ComponentCard key={def.type} def={def} onDragStart={onDragStart} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* 底部提示 */}
                    <div style={{
                        padding: '10px 14px',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        fontSize: 10,
                        color: '#334155',
                        flexShrink: 0,
                    }}>
                        💡 拖拽组件至画布
                    </div>
                </>
            )}
        </div>
    );
}
