export type NodeSettingFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'provider-select'
    | 'model-select'
    | 'checkbox';

export interface NodeSettingField {
    key: string;
    label: string;
    labelFa?: string;
    type: NodeSettingFieldType;
    placeholder?: string;
    options?: { value: string; label: string }[];
    providerClass?: 'text' | 'image' | 'video' | 'audio' | '3d';
    min?: number;
    max?: number;
}

export interface NodeCatalogEntry {
    _id: string;
    type: string;
    category: string;
    label: string;
    labelFa: string;
    description?: string;
    descriptionFa?: string;
    icon?: string;
    defaultData?: Record<string, unknown>;
    settingsFields?: NodeSettingField[];
    providerClass?: string;
    executable?: boolean;
    passthrough?: boolean;
    isActive?: boolean;
    sortOrder?: number;
}

export interface NodeCatalogListResponse {
    nodes: NodeCatalogEntry[];
    totalItems: number;
}

export const CATEGORY_LABELS_FA: Record<string, string> = {
    trigger: 'شروع',
    annotation: 'یادداشت',
    input: 'ورودی',
    generation: 'تولید AI',
    control: 'کنترل',
    logic: 'منطق',
    output: 'خروجی',
    container: 'کانتینر',
};
