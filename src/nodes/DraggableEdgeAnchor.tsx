import React, { useState, useEffect, useCallback } from 'react';
export function DraggableEdgeAnchor({ x, y, edgeId: _edgeId, onDrag }: { x: number, y: number, edgeId: string, onDrag: (dx: number, dy: number) => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setStartPos({ x: e.clientX, y: e.clientY });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        
        // 我们可以将屏幕坐标偏差转换为流内偏移量，但最简单的实现是：
        // 传递 dx dt 给外部逻辑，由外部决定哪部分是可接受的
        onDrag(dx, dy);
        setStartPos({ x: e.clientX, y: e.clientY });
    }, [isDragging, startPos, onDrag]);

    const handlePointerUp = useCallback((e: PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        } else {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, handlePointerMove, handlePointerUp]);

    // 显示为一个隐形的或者半透明的抓手
    return (
        <div
            className="nodrag nopan"
            onPointerDown={handlePointerDown}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                width: 20,
                height: 20,
                background: isDragging ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.8)',
                borderRadius: '50%',
                cursor: 'grab',
                pointerEvents: 'all',
                transition: 'background 0.2s',
                zIndex: 1000,
            }}
        />
    );
}
