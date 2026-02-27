/**
 * 无线电台站组件注册表
 * 
 * 要添加新组件，只需在 COMPONENT_REGISTRY 数组中添加新的配置对象即可。
 * 每个组件定义包含：唯一类型ID、显示名称、分组、颜色、描述和端口列表。
 */

// 端口类型枚举
export type PortType = 'coax' | 'dc' | 'ptt' | 'signal';

// 端口位置枚举
export type PortSide = 'top' | 'bottom' | 'left' | 'right';

// 端口定义
export interface PortDefinition {
    id: string;                // 端口唯一ID（在组件内唯一）
    label: string;             // 端口显示标签
    type: PortType;            // 端口类型
    side: PortSide;            // 端口所在边
    position?: number;         // 位置百分比 0-100，默认均匀分布
}

// 组件分类
export type ComponentCategory = 'transceiver' | 'amplifier' | 'filter' | 'switch' | 'power' | 'passive' | 'accessory';

// 可配置字段定义
export interface ConfigFieldDefinition {
    key: string;           // 字段key，对应 NodeData.config[key]
    label: string;         // 显示标签
    unit?: string;         // 单位（如 'V', 'A'）
    defaultValue: string;  // 默认值
    placeholder?: string;  // 输入框占位符
}

// 组件定义
export interface ComponentDefinition {
    type: string;              // 组件类型ID（全局唯一）
    name: string;              // 显示名称
    category: ComponentCategory;
    color: string;             // 主色调（HSL格式）
    bgColor: string;           // 背景色
    borderColor: string;       // 边框色
    icon: string;              // emoji图标
    description: string;       // 描述
    width: number;             // 默认宽度(px)
    height: number;            // 默认高度(px)
    ports: PortDefinition[] | ((config?: Record<string, string>) => PortDefinition[]);   // 端口列表或基于配置动态生成的端口
    configFields?: ConfigFieldDefinition[];  // 可配置字段（可选）
}

// 辅助函数：安全获取组件当前配置下所有的端口
export function getComponentPorts(def: ComponentDefinition, config?: Record<string, string>): PortDefinition[] {
    if (typeof def.ports === 'function') {
        return def.ports(config);
    }
    return def.ports;
}

// 端口颜色映射（用于连线颜色）
export const PORT_TYPE_COLORS: Record<PortType, string> = {
    coax: '#f59e0b',    // 馈线 - 橙黄色
    dc: '#ef4444',      // 电源线 - 红色
    ptt: '#3b82f6',     // PTT - 蓝色
    signal: '#8b5cf6',  // 信号线 - 紫色
};

// 端口类型标签
export const PORT_TYPE_LABELS: Record<PortType, string> = {
    coax: '馈线',
    dc: '电源线',
    ptt: 'PTT 信号线',
    signal: '信号线',
};

// 分类标签
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
    transceiver: '收发设备',
    amplifier: '放大器',
    filter: '滤波器',
    switch: '开关',
    power: '电源',
    passive: '无源器件',
    accessory: '附件',
};

/**
 * 组件注册表
 * 新增组件：在此数组追加新配置对象即可
 */
export const COMPONENT_REGISTRY: ComponentDefinition[] = [
    // ============ 收发设备 ============
    {
        type: 'radio-transceiver',
        name: '电台',
        category: 'transceiver',
        color: '#06b6d4',
        bgColor: 'rgba(6,182,212,0.1)',
        borderColor: 'rgba(6,182,212,0.6)',
        icon: '📻',
        description: '无线电收发信机',
        width: 160,
        height: 120,
        ports: [
            { id: 'ant', label: '天线', type: 'coax', side: 'left', position: 50 },
            { id: 'ptt', label: 'PTT', type: 'ptt', side: 'right', position: 40 },
            { id: 'dc', label: 'DC', type: 'dc', side: 'right', position: 65 },
        ],
    },
    {
        type: 'split-transceiver',
        name: '收发分离变频器',
        category: 'transceiver',
        color: '#0ea5e9',
        bgColor: 'rgba(14,165,233,0.1)',
        borderColor: 'rgba(14,165,233,0.6)',
        icon: '🎛️',
        description: '收发分离变频器 (Up-Down Converter)',
        width: 170,
        height: 140,
        ports: [
            { id: 'if', label: 'IF', type: 'coax', side: 'left', position: 50 },
            { id: 'tx', label: 'TX', type: 'coax', side: 'right', position: 25 },
            { id: 'rx', label: 'RX', type: 'coax', side: 'right', position: 50 },
            { id: 'lo', label: 'LO', type: 'coax', side: 'right', position: 75 },
            { id: 'ptt', label: 'PTT', type: 'ptt', side: 'bottom', position: 30 },
            { id: 'dc', label: 'DC', type: 'dc', side: 'bottom', position: 70 },
        ],
    },
    {
        type: 'lo-signal',
        name: 'LO信号源',
        category: 'transceiver',
        color: '#8b5cf6',
        bgColor: 'rgba(139,92,246,0.1)',
        borderColor: 'rgba(139,92,246,0.6)',
        icon: '📳',
        description: '本地振荡器信号发生器',
        width: 140,
        height: 100,
        ports: [
            { id: 'dc', label: 'DC', type: 'dc', side: 'bottom', position: 50 },
            { id: 'ref_in', label: 'REF IN', type: 'coax', side: 'left', position: 50 },
            { id: 'lo', label: 'LO', type: 'coax', side: 'right', position: 50 },
        ],
    },
    {
        type: 'gpsdo',
        name: 'GPSDO',
        category: 'transceiver',
        color: '#f59e0b',
        bgColor: 'rgba(245,158,11,0.1)',
        borderColor: 'rgba(245,158,11,0.6)',
        icon: '🛰️',
        description: 'GPS 驯服振荡器',
        width: 140,
        height: 100,
        ports: [
            { id: 'dc', label: 'DC', type: 'dc', side: 'bottom', position: 50 },
            { id: 'ant', label: 'ANT', type: 'coax', side: 'left', position: 50 },
            { id: 'ref_out', label: 'REF OUT', type: 'coax', side: 'right', position: 50 },
        ],
    },
    // ============ 放大器 ============
    {
        type: 'lna',
        name: 'LNA',
        category: 'amplifier',
        color: '#10b981',
        bgColor: 'rgba(16,185,129,0.1)',
        borderColor: 'rgba(16,185,129,0.6)',
        icon: '🔼',
        description: '低噪声放大器 (Low Noise Amplifier)',
        width: 140,
        height: 110,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 40 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 40 },
            { id: 'dc', label: 'DC', type: 'dc', side: 'bottom', position: 50 },
        ],
    },
    {
        type: 'pa',
        name: 'PA',
        category: 'amplifier',
        color: '#f97316',
        bgColor: 'rgba(249,115,22,0.1)',
        borderColor: 'rgba(249,115,22,0.6)',
        icon: '⚡',
        description: '功率放大器 (Power Amplifier)',
        width: 140,
        height: 110,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 40 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 40 },
            { id: 'dc', label: 'DC', type: 'dc', side: 'bottom', position: 50 },
        ],
    },

    // ============ 滤波器 ============
    {
        type: 'bpf',
        name: 'BPF',
        category: 'filter',
        color: '#8b5cf6',
        bgColor: 'rgba(139,92,246,0.1)',
        borderColor: 'rgba(139,92,246,0.6)',
        icon: '〰️',
        description: '带通滤波器 (Band Pass Filter)',
        width: 130,
        height: 100,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 50 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 50 },
        ],
    },
    {
        type: 'lpf',
        name: 'LPF',
        category: 'filter',
        color: '#6366f1',
        bgColor: 'rgba(99,102,241,0.1)',
        borderColor: 'rgba(99,102,241,0.6)',
        icon: '📉',
        description: '低通滤波器 (Low Pass Filter)',
        width: 130,
        height: 100,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 50 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 50 },
        ],
    },
    {
        type: 'hpf',
        name: 'HPF',
        category: 'filter',
        color: '#a855f7',
        bgColor: 'rgba(168,85,247,0.1)',
        borderColor: 'rgba(168,85,247,0.6)',
        icon: '📈',
        description: '高通滤波器 (High Pass Filter)',
        width: 130,
        height: 100,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 50 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 50 },
        ],
    },

    // ============ 开关 ============
    {
        type: 'spdt-switch',
        name: 'SPDT 同轴开关',
        category: 'switch',
        color: '#ec4899',
        bgColor: 'rgba(236,72,153,0.1)',
        borderColor: 'rgba(236,72,153,0.6)',
        icon: '🔀',
        description: '单刀双掷同轴开关 (Single Pole Double Throw)',
        width: 150,
        height: 120,
        ports: [
            { id: 'com', label: 'COM', type: 'coax', side: 'left', position: 50 },
            { id: 'port1', label: 'P1', type: 'coax', side: 'right', position: 30 },
            { id: 'port2', label: 'P2', type: 'coax', side: 'right', position: 70 },
        ],
    },
    {
        type: 'transfer-switch',
        name: 'Transfer 同轴开关',
        category: 'switch',
        color: '#14b8a6',
        bgColor: 'rgba(20,184,166,0.1)',
        borderColor: 'rgba(20,184,166,0.6)',
        icon: '🔄',
        description: '转换同轴开关 (Transfer Switch) - 4端口',
        width: 160,
        height: 130,
        ports: [
            { id: 'rf3', label: 'RF3', type: 'coax', side: 'left', position: 30 },
            { id: 'rf4', label: 'RF4', type: 'coax', side: 'left', position: 70 },
            { id: 'rf1', label: 'RF1', type: 'coax', side: 'right', position: 30 },
            { id: 'rf2', label: 'RF2', type: 'coax', side: 'right', position: 70 },
        ],
    },

    // ============ 电源 ============
    {
        type: 'power-supply',
        name: '电源',
        category: 'power',
        color: '#f43f5e',
        bgColor: 'rgba(244,63,94,0.1)',
        borderColor: 'rgba(244,63,94,0.6)',
        icon: '🔋',
        description: '直流电源（可配置输出电压）',
        width: 140,
        height: 110,
        ports: [
            { id: 'dc_out', label: 'DC OUT', type: 'dc', side: 'right', position: 50 },
        ],
        configFields: [
            { key: 'voltage', label: '输出电压', unit: 'V', defaultValue: '13.8', placeholder: '例如 13.8' },
        ],
    },
    {
        type: 'dc-dc-converter',
        name: 'DCDC',
        category: 'power',
        color: '#fb923c',
        bgColor: 'rgba(251,146,60,0.1)',
        borderColor: 'rgba(251,146,60,0.6)',
        icon: '⚙️',
        description: 'DC-DC 变换器（可配置输出电压）',
        width: 150,
        height: 120,
        ports: [
            { id: 'dc_in', label: 'DC IN', type: 'dc', side: 'left', position: 50 },
            { id: 'dc_out', label: 'DC OUT', type: 'dc', side: 'right', position: 50 },
        ],
        configFields: [
            { key: 'outputVoltage', label: '输出电压', unit: 'V', defaultValue: '5.0', placeholder: '例如 5.0' },
        ],
    },

    // ============ 无源器件 ============
    {
        type: 'attenuator',
        name: '衰减器',
        category: 'passive',
        color: '#9ca3af',
        bgColor: 'rgba(156,163,175,0.1)',
        borderColor: 'rgba(156,163,175,0.6)',
        icon: '➖',
        description: '射频衰减器 (Attenuator)',
        width: 130,
        height: 100,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 50 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 50 },
        ],
    },
    {
        type: 'dummy-load',
        name: '负载',
        category: 'passive',
        color: '#64748b',
        bgColor: 'rgba(100,116,139,0.1)',
        borderColor: 'rgba(100,116,139,0.6)',
        icon: '🪨',
        description: '假负载',
        width: 100,
        height: 100,
        ports: [
            { id: 'in', label: 'IN', type: 'coax', side: 'left', position: 50 },
        ],
    },
    {
        type: 'bidirectional-coupler',
        name: '双向耦合器',
        category: 'passive',
        color: '#84cc16',
        bgColor: 'rgba(132,204,22,0.1)',
        borderColor: 'rgba(132,204,22,0.6)',
        icon: '↔️',
        description: '双向定向耦合器',
        width: 150,
        height: 100,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 50 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 50 },
            { id: 'fwd', label: 'FWD', type: 'coax', side: 'bottom', position: 30 },
            { id: 'rev', label: 'REV', type: 'coax', side: 'bottom', position: 70 },
        ],
    },
    {
        type: 'directional-coupler',
        name: '定向耦合器',
        category: 'passive',
        color: '#84cc16',
        bgColor: 'rgba(132,204,22,0.1)',
        borderColor: 'rgba(132,204,22,0.6)',
        icon: '➡️',
        description: '定向耦合器',
        width: 150,
        height: 100,
        ports: [
            { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 50 },
            { id: 'rf_out', label: 'RF OUT', type: 'coax', side: 'right', position: 50 },
            { id: 'fwd', label: 'FWD', type: 'coax', side: 'bottom', position: 50 },
        ],
    },
    {
        type: 'power-divider',
        name: '功分器',
        category: 'passive',
        color: '#3b82f6',
        bgColor: 'rgba(59,130,246,0.1)',
        borderColor: 'rgba(59,130,246,0.6)',
        icon: '➗',
        description: '功率分配器',
        width: 140,
        height: 120,
        configFields: [
            { key: 'ports', label: '端口数量 (2/4/8)', defaultValue: '2', placeholder: '2/4/8' },
        ],
        ports: (config) => {
            const nStr = config?.ports ?? '2';
            let n = parseInt(nStr, 10);
            if (![2, 4, 8].includes(n)) n = 2;

            const p: PortDefinition[] = [
                { id: 'rf_in', label: 'RF IN', type: 'coax', side: 'left', position: 50 }
            ];

            const step = 100 / (n + 1);
            for (let i = 0; i < n; i++) {
                p.push({
                    id: `ant_${i}`,
                    label: `ANT_${i}`,
                    type: 'coax',
                    side: 'right',
                    position: Math.round(step * (i + 1)),
                });
            }
            return p;
        },
    },

    // ============ 附件 ============
    {
        type: 'antenna',
        name: '天线',
        category: 'accessory',
        color: '#10b981',
        bgColor: 'rgba(16,185,129,0.1)',
        borderColor: 'rgba(16,185,129,0.6)',
        icon: '📡',
        description: '无线电天线',
        width: 100,
        height: 100,
        ports: [
            { id: 'in', label: 'IN', type: 'coax', side: 'bottom', position: 50 },
        ],
    },
];

// 构建类型到定义的快速查找表
export const COMPONENT_MAP: Record<string, ComponentDefinition> = Object.fromEntries(
    COMPONENT_REGISTRY.map((def) => [def.type, def])
);

// 按分类分组
export const COMPONENTS_BY_CATEGORY: Record<ComponentCategory, ComponentDefinition[]> = {} as Record<ComponentCategory, ComponentDefinition[]>;
for (const category of Object.keys(CATEGORY_LABELS) as ComponentCategory[]) {
    COMPONENTS_BY_CATEGORY[category] = COMPONENT_REGISTRY.filter((c) => c.category === category);
}
