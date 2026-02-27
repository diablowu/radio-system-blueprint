import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, useReactFlow, useUpdateNodeInternals, NodeResizer } from '@xyflow/react';
import { COMPONENT_MAP, PORT_TYPE_COLORS, PortSide, PortDefinition, ComponentDefinition, getComponentPorts } from '../registry/componentRegistry';
import NodeConfigPanel from '../components/NodeConfigPanel';
import '@xyflow/react/dist/style.css';

// ──────────────────────────────────────────────
// 数据类型
// ──────────────────────────────────────────────
export interface RadioNodeData extends Record<string, unknown> {
    componentType: string;
    label?: string;
    rotation?: number;                  // 0 | 90 | 180 | 270
    config?: Record<string, string>;    // 可配置字段值 e.g. { voltage: '13.8' }
}

// ──────────────────────────────────────────────
// Handle 定位工具函数
// ──────────────────────────────────────────────
const sideToPosition: Record<PortSide, Position> = {
    top: Position.Top,
    bottom: Position.Bottom,
    left: Position.Left,
    right: Position.Right,
};

function rotatePosition(pos: Position, deg: number): Position {
    const order: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];
    const steps = (deg / 90) % 4;
    const idx = order.indexOf(pos);
    return order[(idx + steps) % 4];
}

function getRotatedPosition(port: PortDefinition, rotation: number): Position {
    return rotatePosition(sideToPosition[port.side], rotation);
}

function getRotatedHandleStyle(port: PortDefinition, rotation: number, defWidth: number, defHeight: number): React.CSSProperties {
    const pct = port.position ?? 50;
    const color = PORT_TYPE_COLORS[port.type];
    const base: React.CSSProperties = {
        top: 'unset', right: 'unset', bottom: 'unset', left: 'unset',
        background: color,
        border: '1px solid #1e293b',
        width: 10,
        height: 10,
        borderRadius: 2,
        zIndex: 10,
        position: 'absolute',
    };

    const isVertical = rotation === 90 || rotation === 270;
    const outW = isVertical ? defHeight : defWidth;
    const outH = isVertical ? defWidth : defHeight;

    const order: PortSide[] = ['top', 'right', 'bottom', 'left'];
    const steps = ((rotation % 360) + 360) / 90 % 4;
    const newSide = order[(order.indexOf(port.side) + steps) % 4];

    let finalLeft = 0;
    let finalTop = 0;

    const INSET = 5;
    if (newSide === 'top') {
        finalLeft = Math.round(outW * (pct / 100));
        finalTop = INSET;
    } else if (newSide === 'bottom') {
        finalLeft = Math.round(outW * (pct / 100));
        finalTop = outH - INSET;
    } else if (newSide === 'left') {
        finalLeft = INSET;
        finalTop = Math.round(outH * (pct / 100));
    } else if (newSide === 'right') {
        finalLeft = outW - INSET;
        finalTop = Math.round(outH * (pct / 100));
    }

    return {
        ...base,
        left: finalLeft - 5,
        top: finalTop - 5,
    };
}

function getPortLabelStyle(port: PortDefinition, rotation: number, outW: number, outH: number): React.CSSProperties {
    const base: React.CSSProperties = {
        position: 'absolute',
        fontSize: '9px',
        fontWeight: 700,
        color: PORT_TYPE_COLORS[port.type],
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        lineHeight: 1,
        letterSpacing: '0.02em',
    };

    const order: PortSide[] = ['top', 'right', 'bottom', 'left'];
    const steps = ((rotation % 360) + 360) / 90 % 4;
    const newSide = order[(order.indexOf(port.side) + steps) % 4];

    const INSET = 14;
    const pct = port.position ?? 50;

    // pct此时是相对于目前自身边长
    const pctLeft = outW * (pct / 100);
    const pctTop = outH * (pct / 100);

    if (newSide === 'left') {
        return { ...base, left: INSET, top: pctTop - 5 };
    } else if (newSide === 'right') {
        return { ...base, right: INSET, top: pctTop - 5, textAlign: 'right' };
    } else if (newSide === 'top') {
        return { ...base, top: INSET, left: pctLeft - 12, textAlign: 'center' };
    } else { // bottom
        return { ...base, bottom: 14, left: pctLeft - 12, textAlign: 'center' };
    }
}

function categoryTag(cat: string) {
    if (cat === 'transceiver') return 'TRX';
    if (cat === 'amplifier') return 'AMP';
    if (cat === 'filter') return 'FILTER';
    if (cat === 'switch') return 'SW';
    if (cat === 'power') return 'PWR';
    return cat.toUpperCase();
}

// ──────────────────────────────────────────────
// 旋转按钮
// ──────────────────────────────────────────────
function RotateButton({ color, rotation, onRotate }: { color: string; rotation: number; onRotate: () => void }) {
    return (
        <button
            className="nodrag nopan"
            onClick={(e) => { e.stopPropagation(); onRotate(); }}
            title={`旋转 90°（当前 ${rotation}°）`}
            style={{
                position: 'absolute',
                top: -28,
                right: 0,
                width: 24,
                height: 24,
                borderRadius: 6,
                border: `1.5px solid ${color}88`,
                background: `${color}22`,
                color,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                lineHeight: 1,
                zIndex: 20,
                backdropFilter: 'blur(4px)',
                transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = `${color}44`;
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = `${color}22`;
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
        >↻</button>
    );
}

// ──────────────────────────────────────────────
// 旋转角度角标
// ──────────────────────────────────────────────
function RotationBadge({ rotation, color }: { rotation: number; color: string }) {
    if (rotation === 0) return null;
    return (
        <div style={{ position: 'absolute', top: -22, left: 0, fontSize: 9, color, fontWeight: 700, letterSpacing: '0.04em', pointerEvents: 'none', opacity: 0.8 }}>
            {rotation}°
        </div>
    );
}

// ──────────────────────────────────────────────
// 配置值显示（节点内部，如电压标签）
// ──────────────────────────────────────────────
function ConfigValueBadge({
    config,
    def,
    rotation,
}: {
    config: Record<string, string>;
    def: ComponentDefinition;
    rotation: number;
}) {
    if (!def.configFields || def.configFields.length === 0) return null;

    const items = def.configFields.map((f) => {
        const val = config[f.key] ?? f.defaultValue;
        return `${val}${f.unit ?? ''}`;
    });

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: `translateX(-50%) rotate(${-rotation}deg)`,
                background: `${def.color}22`,
                border: `1px solid ${def.color}44`,
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 11,
                fontWeight: 700,
                color: def.color,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                letterSpacing: '0.03em',
            }}
        >
            {items.join(' / ')}
        </div>
    );
}

// ──────────────────────────────────────────────
// 双击提示图标（有 configFields 时显示）
// ──────────────────────────────────────────────
function EditHint({ color, rotation }: { color: string; rotation: number }) {
    return (
        <div
            style={{
                position: 'absolute',
                top: 6,
                right: 8,
                fontSize: 9,
                color,
                opacity: 0.5,
                pointerEvents: 'none',
                transform: `rotate(${-rotation}deg)`,
            }}
        >
            ✎
        </div>
    );
}

// ──────────────────────────────────────────────
// SPDT 开关内部连通状态覆盖层
// ──────────────────────────────────────────────
function SPDTSwitchOverlay({
    nodeId,
    config,
    def,
    rotation,
    onToggle,
    width: w,
    height: h,
}: {
    nodeId: string;
    config: Record<string, string>;
    def: ComponentDefinition;
    rotation: number;
    onToggle: (id: string, switched: string) => void;
    width: number;
    height: number;
}) {
    const isSwitched = config.switched === 'true';

    // 根据 componentRegistry.ts 中的 SPDT 定义：
    // COM: left 50%, P1: right 30%, P2: right 70%
    const comX = 0; const comY = h * 0.5;
    const p1X = w; const p1Y = h * 0.3;
    const p2X = w; const p2Y = h * 0.7;

    let pathData = '';
    if (!isSwitched) {
        // 常态: COM 连通 P1 (默认) - 直角连线
        pathData = `M ${comX} ${comY} L ${w * 0.5} ${comY} L ${w * 0.5} ${p1Y} L ${p1X} ${p1Y}`;
    } else {
        // 切换后: COM 连通 P2 - 直角连线
        pathData = `M ${comX} ${comY} L ${w * 0.5} ${comY} L ${w * 0.5} ${p2Y} L ${p2X} ${p2Y}`;
    }

    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
            <svg width={w} height={h} style={{ position: 'absolute', top: 0, left: 0 }}>
                <path
                    d={pathData}
                    fill="none"
                    stroke={def.color}
                    strokeWidth={4}
                    strokeDasharray="6 4"
                    opacity={0.6}
                    style={{ transition: 'd 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
                />
            </svg>
            <button
                className="nodrag nopan"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(nodeId, isSwitched ? 'false' : 'true');
                }}
                style={{
                    position: 'absolute',
                    bottom: 10,
                    left: '50%',
                    transform: `translate(-50%, 0) rotate(${-rotation}deg)`,
                    pointerEvents: 'auto',
                    background: isSwitched ? def.color : 'rgba(15, 23, 42, 0.8)',
                    color: isSwitched ? '#0f172a' : def.color,
                    border: `2px solid ${def.color}`,
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    boxShadow: isSwitched ? `0 0 12px ${def.color}88` : 'none',
                    transition: 'all 0.2s',
                }}
            >
                ⚡
            </button>
            <div style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: `translateX(-50%) rotate(${-rotation}deg)`,
                fontSize: 10,
                color: def.color,
                fontWeight: 700,
                opacity: 0.8,
            }}>
                {isSwitched ? 'COM → P2' : 'COM → P1'}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Transfer 开关内部连通状态覆盖层
// ──────────────────────────────────────────────
function TransferSwitchOverlay({
    nodeId,
    config,
    def,
    rotation,
    onToggle,
    width: w,
    height: h,
}: {
    nodeId: string;
    config: Record<string, string>;
    def: ComponentDefinition;
    rotation: number;
    onToggle: (id: string, switched: string) => void;
    width: number;
    height: number;
}) {
    const isSwitched = config.switched === 'true';

    // 端口位置，根据更新后的 componentRegistry 配置
    // RF3: left 30%
    // RF4: left 70%
    // RF1: right 30%
    // RF2: right 70%
    const rf3X = 0; const rf3Y = h * 0.3;
    const rf4X = 0; const rf4Y = h * 0.7;
    const rf1X = w; const rf1Y = h * 0.3;
    const rf2X = w; const rf2Y = h * 0.7;

    const spacingX = w * 0.25;

    let paths: string[] = [];
    if (!isSwitched) {
        // 常态 (闭合): RF3 -> RF4 和 RF1 -> RF2 (纵向)
        // 为避免与边框重合，进入内部走直角再回端口
        paths.push(`M ${rf3X} ${rf3Y} L ${spacingX} ${rf3Y} L ${spacingX} ${rf4Y} L ${rf4X} ${rf4Y}`);
        paths.push(`M ${rf1X} ${rf1Y} L ${w - spacingX} ${rf1Y} L ${w - spacingX} ${rf2Y} L ${rf2X} ${rf2Y}`);
    } else {
        // 切换后 (打开): RF3 -> RF1 和 RF4 -> RF2 (横向)
        paths.push(`M ${rf3X} ${rf3Y} L ${rf1X} ${rf1Y}`);
        paths.push(`M ${rf4X} ${rf4Y} L ${rf2X} ${rf2Y}`);
    }

    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
            <svg width={w} height={h} style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                    <marker
                        id={`arrow-${nodeId}`}
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="4"
                        markerHeight="4"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={def.color} opacity={0.6} />
                    </marker>
                </defs>
                {paths.map((d, idx) => (
                    <path
                        key={idx}
                        d={d}
                        fill="none"
                        stroke={def.color}
                        strokeWidth={3}
                        strokeDasharray="6 4"
                        opacity={0.6}
                        markerEnd={`url(#arrow-${nodeId})`}
                        style={{ transition: 'd 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
                    />
                ))}
            </svg>
            <button
                className="nodrag nopan"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(nodeId, isSwitched ? 'false' : 'true');
                }}
                style={{
                    position: 'absolute',
                    bottom: 10,
                    left: '50%',
                    transform: `translate(-50%, 0) rotate(${-rotation}deg)`,
                    pointerEvents: 'auto',
                    background: isSwitched ? def.color : 'rgba(15, 23, 42, 0.8)',
                    color: isSwitched ? '#0f172a' : def.color,
                    border: `2px solid ${def.color}`,
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    boxShadow: isSwitched ? `0 0 12px ${def.color}88` : 'none',
                    transition: 'all 0.2s',
                }}
            >
                ⚡
            </button>
            <div style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: `translateX(-50%) rotate(${-rotation}deg)`,
                fontSize: 10,
                color: def.color,
                fontWeight: 700,
                opacity: 0.8,
            }}>
                {isSwitched ? 'RF3→RF1 / RF4→RF2' : 'RF3→RF4 / RF1→RF2'}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// 主节点组件
// ──────────────────────────────────────────────
function RadioNode({ id, data, selected, width, height }: NodeProps) {
    const nodeData = data as unknown as RadioNodeData;
    const def = COMPONENT_MAP[nodeData.componentType];
    const { updateNodeData } = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();

    const rotation = (nodeData.rotation as number) ?? 0;
    const config = (nodeData.config as Record<string, string>) ?? {};

    // 配置面板开关 & 面板显示位置（屏幕坐标）
    const [configPanelPos, setConfigPanelPos] = useState<{ x: number; y: number } | null>(null);
    const outerRef = useRef<HTMLDivElement>(null);

    // 旋转后强制 React Flow 重新测量 Handle 位置
    useEffect(() => {
        const raf = requestAnimationFrame(() => updateNodeInternals(id));
        return () => cancelAnimationFrame(raf);
    }, [id, rotation, updateNodeInternals]);

    // 顺时针旋转 90°
    const handleRotate = useCallback(() => {
        updateNodeData(id, { rotation: (rotation + 90) % 360 });
    }, [id, rotation, updateNodeData]);

    // 双击打开配置面板（仅当组件有 configFields 时）
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (!def?.configFields?.length) return;
        e.stopPropagation();
        // 取节点外层 div 的中心点作为面板锚点
        if (outerRef.current) {
            const rect = outerRef.current.getBoundingClientRect();
            setConfigPanelPos({ x: rect.left + rect.width / 2, y: rect.top });
        }
    }, [def]);

    // 保存配置
    const handleSaveConfig = useCallback((nodeId: string, newConfig: Record<string, string>) => {
        updateNodeData(nodeId, { config: newConfig });
    }, [updateNodeData]);

    // 切换 Transfer 开关状态
    const handleToggleState = useCallback((nodeId: string, switched: string) => {
        updateNodeData(nodeId, { config: { ...config, switched } });
    }, [config, updateNodeData]);

    // 关闭配置面板
    const handleCloseConfig = useCallback(() => setConfigPanelPos(null), []);

    if (!def) {
        return (
            <div style={{ padding: 12, background: '#333', color: '#fff', borderRadius: 8 }}>
                未知组件: {nodeData.componentType}
            </div>
        );
    }

    const label = (nodeData.label as string) || def.name;
    const hasConfig = (def.configFields?.length ?? 0) > 0;

    const isVertical = rotation === 90 || rotation === 270;

    // 获取最终要显示的实际计算宽高
    // 注意：@xyflow/react v12 首次渲染时可能传入 width/height = 0（测量中），
    // 此时必须回退到 def 的默认尺寸，否则节点会塌缩为 0x0 并被隐藏
    const outWidth = (width && width > 0) ? width : (isVertical ? def.height : def.width);
    const outHeight = (height && height > 0) ? height : (isVertical ? def.width : def.height);

    // 对于带有 transform: rotate 的组件来说，拖动横向会导致它在逻辑里是高在变化，必须反推当前其内部模型的逻辑长宽
    const innerWidth = isVertical ? outHeight : outWidth;
    const innerHeight = isVertical ? outWidth : outHeight;

    const outerStyle: React.CSSProperties = {
        position: 'relative',
        width: outWidth,
        height: outHeight,
    };

    const innerStyle: React.CSSProperties = {
        width: innerWidth,
        height: innerHeight,
        background: '#1e293b', // 扁平化背景
        border: `2px solid ${def.color}`,
        borderRadius: 8,
        position: 'absolute',
        top: '50%',
        left: '50%',
        boxSizing: 'border-box',
        boxShadow: selected
            ? `0 0 0 2px ${def.color}88, 0 4px 16px rgba(0,0,0,0.4)`
            : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        cursor: hasConfig ? 'pointer' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        userSelect: 'none',
        overflow: 'visible',
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
    };

    return (
        <div ref={outerRef} style={outerStyle} className="radio-node" onDoubleClick={handleDoubleClick}>
            {/* 拖拽缩放手柄器 */}
            <NodeResizer
                color="#5eead4"
                isVisible={selected}
                minWidth={30}
                minHeight={30}
            />

            {/* 选中时显示旋转按钮 */}
            {selected && (
                <RotateButton color={def.color} rotation={rotation} onRotate={handleRotate} />
            )}

            {/* 内层（随旋转角度转动） */}
            <div style={innerStyle}>

                {/* 有配置字段时显示编辑提示 */}
                {hasConfig && <EditHint color={def.color} rotation={rotation} />}

                {/* 组件名称恢复放于正中 */}
                <div style={{
                    fontSize: 18, fontWeight: 800, color: '#e2e8f0', textAlign: 'center',
                    maxWidth: innerWidth - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    transform: `rotate(${-rotation}deg)`,
                }}>
                    {def.icon} {label}
                </div>

                {/* 配置值显示（如电压） */}
                {hasConfig && (
                    <ConfigValueBadge config={config} def={def} rotation={rotation} />
                )}

                {/* SPDT 开关动画层 */}
                {def.type === 'spdt-switch' && (
                    <SPDTSwitchOverlay
                        nodeId={id}
                        config={config}
                        def={def}
                        rotation={rotation}
                        onToggle={handleToggleState}
                        width={innerWidth}
                        height={innerHeight}
                    />
                )}

                {/* Transfer 开关动画层 */}
                {def.type === 'transfer-switch' && (
                    <TransferSwitchOverlay
                        nodeId={id}
                        config={config}
                        def={def}
                        rotation={rotation}
                        onToggle={handleToggleState}
                        width={innerWidth}
                        height={innerHeight}
                    />
                )}
            </div>

            {/* 端口标签，移出 innerStyle，直接通过绝对宽高的相对值挂载在外层，实现真正免转且完全精准对齐 */}
            {getComponentPorts(def, config).map((port) => (
                <div key={`label-${port.id}`} style={getPortLabelStyle(port, rotation, outWidth, outHeight)}>
                    {port.label}
                </div>
            ))}

            {/* Handles：移出 innerStyle，避免因 transform 导致 React Flow 算错坐标 */}
            {getComponentPorts(def, config).map((port) => {
                const rotatedSide = rotatePosition(sideToPosition[port.side], rotation);
                return (
                    <Handle
                        key={port.id}
                        id={port.id}
                        type="source"
                        position={rotatedSide}
                        style={getRotatedHandleStyle(port, rotation, innerWidth, innerHeight)}
                        className="radio-port"
                        title={`${port.label} (${port.type})`}
                    />
                );
            })}

            {/* 配置面板（通过 Portal 渲染到 body，避免被节点裁剪） */}
            {configPanelPos && hasConfig &&
                createPortal(
                    <NodeConfigPanel
                        nodeId={id}
                        def={def}
                        config={config}
                        position={configPanelPos}
                        onSave={handleSaveConfig}
                        onClose={handleCloseConfig}
                    />,
                    document.body
                )
            }
        </div>
    );
}

export default memo(RadioNode);
