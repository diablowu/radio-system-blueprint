import { memo } from 'react';
import { EdgeProps, EdgeLabelRenderer, useReactFlow, Position } from '@xyflow/react';
import { DraggableEdgeAnchor } from './DraggableEdgeAnchor';
import { PORT_TYPE_COLORS, PORT_TYPE_LABELS, PortType } from '../registry/componentRegistry';

export interface RadioEdgeData extends Record<string, unknown> {
    edgeType: PortType;
    label?: string;
    remark?: string;
    cableModel?: string;
    length?: number;
    insertionLoss?: number;
}

export interface DragOffsetData {
    x?: number;
    y?: number;
}

// 边的视觉样式配置
const EDGE_STYLE: Record<PortType, { strokeDasharray?: string; strokeWidth: number }> = {
    coax: { strokeWidth: 2.5 },
    dc: { strokeWidth: 2, strokeDasharray: '6,3' },
    ptt: { strokeWidth: 1.5, strokeDasharray: '3,3' },
    signal: { strokeWidth: 1.5, strokeDasharray: '8,4,2,4' },
};

function RadioEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    data,
    selected,
    markerEnd,
}: EdgeProps) {
    const edgeData = data as unknown as RadioEdgeData;
    const edgeType: PortType = (edgeData?.edgeType as PortType) ?? 'coax';
    const color = PORT_TYPE_COLORS[edgeType];
    const style = EDGE_STYLE[edgeType];

    const { setEdges, getZoom } = useReactFlow();

    // 我们强制所有边通过正交路进行走线，默认先水平、后垂直，除非用户拖拽配置过偏移或者原本端点就是上下
    const isHorizontal = sourcePosition === Position.Left || sourcePosition === Position.Right;

    // 获取/设置偏差值
    const customOffset = (edgeData as any)?.dragOffset || { x: 0, y: 0 };

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    // === 【算法修复】：加入双段式的全向环绕正交路由规避 ===
    // 现在无论什么情况，我们统一使用一个万能的三段式连接法。

    if (isHorizontal) {
        // 第一种情况：以X轴为主轴延展
        let midX = sourceX + (targetX - sourceX) * 0.5;
        midX += customOffset.x || 0;

        let path = `M ${sourceX} ${sourceY}`;

        // 此判断为了解决如果两个组件过于靠近并且面对面背对导致线画进内部的问题
        const diffX = targetX - sourceX;
        if ((sourcePosition === Position.Right && diffX < 0) || (sourcePosition === Position.Left && diffX > 0)) {
            // 需要绕开。强制先往外走一段 safe distance，再绕过去。
            const safeDistance = 30;
            const sign = sourcePosition === Position.Right ? 1 : -1;
            path += ` L ${sourceX + sign * safeDistance} ${sourceY}`;
            path += ` L ${sourceX + sign * safeDistance} ${sourceY + customOffset.y}`;
            path += ` L ${targetX} ${sourceY + customOffset.y}`;
            path += ` L ${targetX} ${targetY}`; // 修改：必须连接到目标y点，否则末端脱钩

            labelX = sourceX;
            labelY = sourceY + customOffset.y;
        } else {
            path += ` L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
            labelX = midX;
            labelY = sourceY + (targetY - sourceY) / 2;
        }

        edgePath = path;

    } else {
        // 第二种情况：以Y轴为主轴延展 (比如 Top/Bottom 端口)
        let midY = sourceY + (targetY - sourceY) * 0.5;
        midY += customOffset.y || 0;

        let path = `M ${sourceX} ${sourceY}`;

        const diffY = targetY - sourceY;
        if ((sourcePosition === Position.Bottom && diffY < 0) || (sourcePosition === Position.Top && diffY > 0)) {
            // 需要绕开
            const safeDistance = 30;
            const sign = sourcePosition === Position.Bottom ? 1 : -1;
            path += ` L ${sourceX} ${sourceY + sign * safeDistance}`;
            path += ` L ${sourceX + customOffset.x} ${sourceY + sign * safeDistance}`;
            path += ` L ${sourceX + customOffset.x} ${targetY}`;
            path += ` L ${targetX} ${targetY}`; // 修改：必须连接到目标x点

            labelX = sourceX + customOffset.x;
            labelY = sourceY;
        } else {
            path += ` L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
            labelX = sourceX + (targetX - sourceX) / 2;
            labelY = midY;
        }

        edgePath = path;
    }

    const handleDrag = (dx: number, dy: number) => {
        const zoom = getZoom();
        setEdges((eds) =>
            eds.map(e => {
                if (e.id === id) {
                    const currentOffset = (e.data as any)?.dragOffset || { x: 0, y: 0 };
                    return {
                        ...e,
                        data: {
                            ...e.data,
                            dragOffset: {
                                x: (currentOffset.x || 0) + dx / zoom,
                                y: (currentOffset.y || 0) + dy / zoom,
                            }
                        }
                    };
                }
                return e;
            })
        );
    };

    const strokeColor = selected ? '#ffffff' : color;
    const opacity = selected ? 1 : 0.75;
    const labelText = (edgeData?.label as string) ?? PORT_TYPE_LABELS[edgeType];

    let fullLabel = labelText;
    if (edgeData?.remark) {
        fullLabel += ` (${edgeData.remark})`;
    }
    if (edgeType === 'coax') {
        const specs = [];
        if (edgeData?.cableModel) specs.push(edgeData.cableModel);
        if (edgeData?.length !== undefined && !isNaN(edgeData.length)) specs.push(`${edgeData.length}m`);
        if (edgeData?.insertionLoss !== undefined && !isNaN(edgeData.insertionLoss)) specs.push(`${edgeData.insertionLoss}dB`);

        if (specs.length > 0) {
            fullLabel += ` [${specs.join(' · ')}]`;
        }
    }

    return (
        <>
            {/* 隐形点击命中区域 (hitbox) */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="react-flow__edge-interaction"
            />
            {/* 原本高亮发光层 */}
            <path
                d={edgePath}
                fill="none"
                stroke={color}
                strokeWidth={style.strokeWidth + 6}
                opacity={selected ? 0.35 : 0.12}
                strokeLinecap="round"
                style={{ filter: 'blur(3px)', pointerEvents: 'none' }}
            />
            {/* 实际渲染虚实层 */}
            <path
                id={id}
                d={edgePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={style.strokeWidth}
                strokeDasharray={style.strokeDasharray}
                strokeLinecap="round"
                opacity={opacity}
                markerEnd={markerEnd}
                style={{ pointerEvents: 'none' }}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        cursor: 'pointer',
                    }}
                    className="nodrag nopan"
                >
                    {selected && (
                        <div style={{
                            background: `${color}22`,
                            border: `1px solid ${color}88`,
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 9,
                            color,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            backdropFilter: 'blur(4px)',
                        }}>
                            {fullLabel}
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>
            {selected && (
                <EdgeLabelRenderer>
                    <DraggableEdgeAnchor
                        x={labelX}
                        y={labelY}
                        edgeId={id}
                        onDrag={handleDrag}
                    />
                </EdgeLabelRenderer>
            )}
        </>
    );
}

export default memo(RadioEdge);
