import { useReactFlow, Edge } from '@xyflow/react';
import { RadioEdgeData } from '../nodes/RadioEdge';

export default function EdgeConfigPanel({
    edge,
    isDarkMode = true
}: {
    edge: Edge;
    isDarkMode?: boolean;
}) {
    const { setEdges } = useReactFlow();
    const data = (edge.data as unknown as RadioEdgeData) || {};

    const updateData = (key: keyof RadioEdgeData, value: string | number) => {
        setEdges((eds) =>
            eds.map((e) => {
                if (e.id === edge.id) {
                    return {
                        ...e,
                        data: {
                            ...e.data,
                            [key]: value,
                        }
                    };
                }
                return e;
            })
        );
    };

    const panelBg = isDarkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)';
    const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
    const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
    const inputBg = isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)';

    const inputStyle = {
        width: '100%',
        boxSizing: 'border-box' as const,
        background: inputBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        padding: '6px 8px',
        color: textColor,
        fontSize: 11,
        outline: 'none',
        marginBottom: 8,
    };

    const labelStyle = {
        display: 'block',
        fontSize: 10,
        color: labelColor,
        marginBottom: 4,
        fontWeight: 600,
    };

    return (
        <div style={{
            position: 'absolute',
            right: 16,
            top: 70,
            width: 200,
            background: panelBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: 14,
            zIndex: 50,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
            <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: textColor,
                marginBottom: 12,
                borderBottom: `1px solid ${borderColor}`,
                paddingBottom: 6,
            }}>
                🔗 连线属性设置
            </div>

            <div>
                <label style={labelStyle}>备注说明</label>
                <input
                    type="text"
                    value={data.remark || ''}
                    onChange={(e) => updateData('remark', e.target.value)}
                    placeholder="例如: 屏蔽线/过流跳线"
                    style={inputStyle}
                />
            </div>

            {data.edgeType === 'coax' && (
                <>
                    <div>
                        <label style={labelStyle}>线缆型号 (Coax Model)</label>
                        <input
                            type="text"
                            value={data.cableModel || ''}
                            onChange={(e) => updateData('cableModel', e.target.value)}
                            placeholder="如: LMR-400 / 1/2馈线"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>物理长度 (米)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={data.length || ''}
                            onChange={(e) => updateData('length', parseFloat(e.target.value))}
                            placeholder="如: 1.5"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>插入损耗 (dB)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={data.insertionLoss || ''}
                            onChange={(e) => updateData('insertionLoss', parseFloat(e.target.value))}
                            placeholder="如: 0.5"
                            style={inputStyle}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
