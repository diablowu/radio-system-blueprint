import { Position } from '@xyflow/react';

export function getOrthogonalPath(
    sourceX: number,
    sourceY: number,
    sourcePos: Position,
    targetX: number,
    targetY: number,
    _targetPos: Position,
    offset: number
) {
    const isHorizontal = sourcePos === Position.Left || sourcePos === Position.Right;
    
    let path = '';
    let labelX = 0;
    let labelY = 0;
    
    if (isHorizontal) {
        // 源水平出，我们先走一段水平线，然后垂直，最后水平入
        const midX = sourceX + (targetX - sourceX) * 0.5 + offset;
        path = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
        labelX = midX;
        labelY = sourceY + (targetY - sourceY) / 2;
    } else {
        // 源垂直出
        const midY = sourceY + (targetY - sourceY) * 0.5 + offset;
        path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
        labelX = sourceX + (targetX - sourceX) / 2;
        labelY = midY;
    }

    return [path, labelX, labelY] as const;
}
