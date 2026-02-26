import { memo } from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow, Position } from '@xyflow/react';
import { DraggableEdgeAnchor } from './DraggableEdgeAnchor';
import { PORT_TYPE_COLORS, PORT_TYPE_LABELS, PortType } from '../registry/componentRegistry';

export interface RadioEdgeData extends Record<string, unknown> {
    edgeType: PortType;
    label?: string;
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
    targetPosition,
    data,
    selected,
    markerEnd,
}: EdgeProps) {
    const edgeData = data as unknown as RadioEdgeData;
    const edgeType: PortType = (edgeData?.edgeType as PortType) ?? 'coax';
    const color = PORT_TYPE_COLORS[edgeType];
    const style = EDGE_STYLE[edgeType];

    const { setEdges, screenToFlowPosition, getZoom } = useReactFlow();
    const isHorizontal = sourcePosition === Position.Left || sourcePosition === Position.Right;

    // 获取/设置偏差值
    const customOffset = (edgeData as any)?.dragOffset?.[isHorizontal ? 'x' : 'y'] || 0;

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    // 对于水平两端点（如同轴）走线为：平 -> 竖直转折线 -> 平
    // 对于垂直端点（如天线、DC）走线为：竖 -> 水平转折线 -> 竖
    if (isHorizontal) {
        let midX = sourceX + (targetX - sourceX) * 0.5;
        // 使用内置的算法获取一个基础的 Path 来做验证，但更安全的是直接重写：
        midX += customOffset;
        edgePath = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
        labelX = midX;
        labelY = sourceY + (targetY - sourceY) / 2;
    } else {
        let midY = sourceY + (targetY - sourceY) * 0.5;
        midY += customOffset;
        edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
        labelX = sourceX + (targetX - sourceX) / 2;
        labelY = midY;
    }

    const handleDrag = (dx: number, dy: number) => {
        // 根据当前的缩放级别调整 dx dy
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
                                x: (currentOffset.x || 0) + (isHorizontal ? dx / zoom : 0),
                                y: (currentOffset.y || 0) + (isHorizontal ? 0 : dy / zoom),
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

    return (
        <>
            {/* 发光底层 */}
            <path
                d={edgePath}
                fill="none"
                stroke={color}
                strokeWidth={style.strokeWidth + 6}
                opacity={selected ? 0.35 : 0.12}
                strokeLinecap="round"
                style={{ filter: 'blur(3px)', pointerEvents: 'none' }}
            />
            {/* 主线 */}
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
                style={{ cursor: 'pointer' }}
            />

            {/* 类型标签（选中时显示）*/}
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
                            {labelText}
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>

            {/* 当边被选中时出现的调整手柄，置于整条线的正中 */}
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
