export interface ProcessErrorItem {
    id: string;
    nodeId?: string;
    nodeType?: string;
    nodeLabel?: string;
    runId?: string;
    /** متن خود فرانت (ترجمه‌شده) — همان نمایش داده می‌شود */
    message: string;
    /** خطای خام سرور/worker — فقط از طریق HoshetonError نمایش داده می‌شود */
    error?: string;
    timestamp: string;
}
