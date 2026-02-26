import React, { useEffect, useRef, useState } from 'react';
import { ComponentDefinition } from '../registry/componentRegistry';

interface NodeConfigPanelProps {
    nodeId: string;
    def: ComponentDefinition;
    config: Record<string, string>;
    position: { x: number; y: number }; // 屏幕坐标
    onSave: (nodeId: string, config: Record<string, string>) => void;
    onClose: () => void;
}

export default function NodeConfigPanel({
    nodeId,
    def,
    config,
    position,
    onSave,
    onClose,
}: NodeConfigPanelProps) {
    const [draft, setDraft] = useState<Record<string, string>>(() => {
        // 用当前 config 填充，缺省时用 defaultValue
        const init: Record<string, string> = {};
        for (const field of def.configFields ?? []) {
            init[field.key] = config[field.key] ?? field.defaultValue;
        }
        return init;
    });

    const panelRef = useRef<HTMLDivElement>(null);

    // 点击面板外部关闭
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // 延迟绑定，避免触发打开面板的那次双击
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleMouseDown);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [onClose]);

    // Esc 关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter') handleSave();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [draft]); // eslint-disable-line

    const handleSave = () => {
        onSave(nodeId, draft);
        onClose();
    };

    // 面板定位：以 position 为中心，自动避开边界
    const panelStyle: React.CSSProperties = {
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -110%)',
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.97)',
        border: `1.5px solid ${def.color}55`,
        borderRadius: 12,
        padding: '14px 16px',
        minWidth: 220,
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${def.color}22`,
        backdropFilter: 'blur(16px)',
        color: '#e2e8f0',
        fontFamily: 'inherit',
    };

    if (!def.configFields || def.configFields.length === 0) return null;

    return (
        <div ref={panelRef} style={panelStyle} className="nodrag nopan">
            {/* 标题 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{def.icon}</span>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: def.color }}>{def.name}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>属性配置</div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#475569',
                        cursor: 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: 2,
                    }}
                >
                    ✕
                </button>
            </div>

            {/* 分割线 */}
            <div style={{ height: 1, background: `${def.color}22`, marginBottom: 12 }} />

            {/* 配置字段 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {def.configFields.map((field) => (
                    <div key={field.key}>
                        <label style={{
                            display: 'block',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#94a3b8',
                            marginBottom: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {field.label}
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={draft[field.key] ?? field.defaultValue}
                                placeholder={field.placeholder}
                                autoFocus
                                onChange={(e) =>
                                    setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                style={{
                                    width: '100%',
                                    padding: '6px 36px 6px 10px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${def.color}44`,
                                    borderRadius: 6,
                                    color: '#e2e8f0',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                    transition: 'border-color 0.15s',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = def.color;
                                    e.currentTarget.style.boxShadow = `0 0 0 2px ${def.color}22`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = `${def.color}44`;
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                            {field.unit && (
                                <span style={{
                                    position: 'absolute',
                                    right: 10,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: def.color,
                                    pointerEvents: 'none',
                                }}>
                                    {field.unit}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                    onClick={onClose}
                    style={{
                        flex: 1,
                        padding: '6px 0',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'inherit',
                    }}
                >
                    取消
                </button>
                <button
                    onClick={handleSave}
                    style={{
                        flex: 2,
                        padding: '6px 0',
                        background: def.color,
                        border: 'none',
                        borderRadius: 6,
                        color: '#0f172a',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        boxShadow: `0 2px 8px ${def.color}44`,
                    }}
                >
                    确认 ↵
                </button>
            </div>

            {/* 小三角指向节点 */}
            <div style={{
                position: 'absolute',
                bottom: -7,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 14,
                height: 7,
                overflow: 'hidden',
            }}>
                <div style={{
                    width: 10,
                    height: 10,
                    background: 'rgba(15, 23, 42, 0.97)',
                    border: `1.5px solid ${def.color}55`,
                    transform: 'rotate(45deg)',
                    margin: '0 auto',
                    marginTop: -6,
                }} />
            </div>
        </div>
    );
}
