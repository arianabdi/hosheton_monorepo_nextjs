export const REQUEST_PROFILE_ADAPTERS = ['atlas-prediction', 'fal-queue'] as const;
export const REQUEST_PROFILE_ENVELOPES = ['flat', 'nested-input'] as const;
export const REQUEST_PROFILE_SOURCES = ['prompt', 'image', 'video', 'audio', 'mask'] as const;
export const REQUEST_PROFILE_SELECTIONS = ['first', 'last', 'all', 'index'] as const;
export const REQUEST_PROFILE_MATERIALIZATIONS = ['public-url', 'data-url', 'preserve'] as const;

export type ProviderRequestAdapter = (typeof REQUEST_PROFILE_ADAPTERS)[number];
export type ProviderRequestEnvelope = (typeof REQUEST_PROFILE_ENVELOPES)[number];
export type ProviderRequestSource = (typeof REQUEST_PROFILE_SOURCES)[number];
export type ProviderRequestBindingSelection = (typeof REQUEST_PROFILE_SELECTIONS)[number];
export type ProviderRequestMaterialization = (typeof REQUEST_PROFILE_MATERIALIZATIONS)[number];

export interface ProviderRequestInputBinding {
    source: ProviderRequestSource;
    payloadPath: string;
    selection?: ProviderRequestBindingSelection;
    index?: number;
    maxItems?: number;
    required?: boolean;
    materialization?: ProviderRequestMaterialization;
    /** هر مقدار به شکل آبجکت فرستاده می‌شود: `{ ...defaults, [valueKey]: url }` */
    item?: {
        valueKey: string;
        defaults?: Record<string, unknown>;
    };
}

export interface ProviderRequestProfile {
    adapter?: ProviderRequestAdapter;
    submitPath?: {
        strategy: 'fixed' | 'endpoint';
        path?: string;
    };
    envelope?: ProviderRequestEnvelope;
    inputKey?: string;
    promptPath?: string;
    bindings?: ProviderRequestInputBinding[];
    /** کلید تنظیم → نام فیلد در درخواست همین provider، مثل { "image_size": "size" } */
    settingPaths?: Record<string, string>;
    outputPaths?: {
        images?: string[];
        video?: string[];
    };
}

const BLOCKED_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const SAFE_PAYLOAD_PATH = /^[A-Za-z_][A-Za-z0-9_-]*(?:\.(?:[A-Za-z_][A-Za-z0-9_-]*|\d+))*$/;

function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validatePayloadPath(
    value: unknown,
    label: string,
    errors: string[],
    requireSafePayloadPath = false,
): value is string {
    if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${label} باید مسیر غیرخالی باشد.`);
        return false;
    }
    const segments = value
        .trim()
        .replace(/^\$\.?/, '')
        .replace(/\[(?:["']?)([^"'\]]+)(?:["']?)\]/g, '.$1')
        .split('.')
        .filter(Boolean);
    if (segments.some((segment) => BLOCKED_PATH_SEGMENTS.has(segment))) {
        errors.push(`${label} شامل بخش غیرمجاز است.`);
        return false;
    }
    if (requireSafePayloadPath && !SAFE_PAYLOAD_PATH.test(value.trim())) {
        errors.push(`${label} باید مسیر payload امن مانند input.reference_images باشد.`);
        return false;
    }
    return true;
}

function validateOutputPathList(
    value: unknown,
    label: string,
    errors: string[],
): void {
    if (!Array.isArray(value)) {
        errors.push(`${label} باید آرایه‌ای از مسیرها باشد.`);
        return;
    }
    value.forEach((path, index) => validatePayloadPath(path, `${label}[${index}]`, errors));
}

export function validateRequestProfile(value: unknown, label = 'requestProfile'): string[] {
    const errors: string[] = [];
    if (!isObject(value)) return [`${label} باید object JSON باشد.`];

    if (value.adapter != null && !REQUEST_PROFILE_ADAPTERS.includes(value.adapter as ProviderRequestAdapter)) {
        errors.push(`${label}.adapter باید یکی از ${REQUEST_PROFILE_ADAPTERS.join(' یا ')} باشد.`);
    }
    if (value.envelope != null && !REQUEST_PROFILE_ENVELOPES.includes(value.envelope as ProviderRequestEnvelope)) {
        errors.push(`${label}.envelope باید flat یا nested-input باشد.`);
    }
    if (value.inputKey != null) {
        validatePayloadPath(value.inputKey, `${label}.inputKey`, errors, true);
    }
    if (value.promptPath != null) {
        validatePayloadPath(value.promptPath, `${label}.promptPath`, errors, true);
    }

    if (value.submitPath != null) {
        if (!isObject(value.submitPath)) {
            errors.push(`${label}.submitPath باید object باشد.`);
        } else {
            if (!['fixed', 'endpoint'].includes(String(value.submitPath.strategy || ''))) {
                errors.push(`${label}.submitPath.strategy باید fixed یا endpoint باشد.`);
            }
            if (value.submitPath.strategy === 'fixed') {
                validatePayloadPath(value.submitPath.path, `${label}.submitPath.path`, errors);
            } else if (value.submitPath.path != null && typeof value.submitPath.path !== 'string') {
                errors.push(`${label}.submitPath.path باید string باشد.`);
            }
        }
    }

    if (value.bindings != null) {
        if (!Array.isArray(value.bindings)) {
            errors.push(`${label}.bindings باید آرایه باشد.`);
        } else {
            const destinations = new Set<string>();
            value.bindings.forEach((binding, index) => {
                const bindingLabel = `${label}.bindings[${index}]`;
                if (!isObject(binding)) {
                    errors.push(`${bindingLabel} باید object باشد.`);
                    return;
                }
                if (!REQUEST_PROFILE_SOURCES.includes(binding.source as ProviderRequestSource)) {
                    errors.push(`${bindingLabel}.source معتبر نیست.`);
                }
                if (validatePayloadPath(binding.payloadPath, `${bindingLabel}.payloadPath`, errors, true)) {
                    const destination = binding.payloadPath.trim();
                    if (destinations.has(destination)) {
                        errors.push(`${bindingLabel}.payloadPath تکراری است.`);
                    }
                    destinations.add(destination);
                }
                if (binding.selection != null
                    && !REQUEST_PROFILE_SELECTIONS.includes(binding.selection as ProviderRequestBindingSelection)) {
                    errors.push(`${bindingLabel}.selection معتبر نیست.`);
                }
                if (binding.selection === 'index'
                    && (!Number.isInteger(binding.index) || Number(binding.index) < 0)) {
                    errors.push(`${bindingLabel}.index برای selection=index باید عدد صحیح نامنفی باشد.`);
                }
                if (binding.index != null && (!Number.isInteger(binding.index) || Number(binding.index) < 0)) {
                    errors.push(`${bindingLabel}.index باید عدد صحیح نامنفی باشد.`);
                }
                if (binding.maxItems != null
                    && (!Number.isInteger(binding.maxItems) || Number(binding.maxItems) < 1)) {
                    errors.push(`${bindingLabel}.maxItems باید عدد صحیح مثبت باشد.`);
                }
                if (binding.required != null && typeof binding.required !== 'boolean') {
                    errors.push(`${bindingLabel}.required باید boolean باشد.`);
                }
                if (binding.materialization != null
                    && !REQUEST_PROFILE_MATERIALIZATIONS.includes(
                        binding.materialization as ProviderRequestMaterialization,
                    )) {
                    errors.push(`${bindingLabel}.materialization معتبر نیست.`);
                }
                if (binding.item != null) {
                    if (!isObject(binding.item)) {
                        errors.push(`${bindingLabel}.item باید object باشد.`);
                    } else {
                        const valueKey = String(binding.item.valueKey || '').trim();
                        if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(valueKey) || BLOCKED_PATH_SEGMENTS.has(valueKey)) {
                            errors.push(`${bindingLabel}.item.valueKey باید نام فیلد معتبر مانند url باشد.`);
                        }
                        if (binding.item.defaults != null && !isObject(binding.item.defaults)) {
                            errors.push(`${bindingLabel}.item.defaults باید object باشد.`);
                        } else if (isObject(binding.item.defaults)
                            && Object.keys(binding.item.defaults).some((key) => BLOCKED_PATH_SEGMENTS.has(key))) {
                            errors.push(`${bindingLabel}.item.defaults شامل کلید غیرمجاز است.`);
                        }
                    }
                }
            });
        }
    }

    if (value.settingPaths != null) {
        if (!isObject(value.settingPaths)) {
            errors.push(`${label}.settingPaths باید object باشد: { "کلید تنظیم": "نام فیلد درخواست" }.`);
        } else {
            Object.entries(value.settingPaths).forEach(([key, path]) => {
                if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key) || BLOCKED_PATH_SEGMENTS.has(key)) {
                    errors.push(`${label}.settingPaths: «${key}» کلید تنظیم معتبر نیست.`);
                }
                validatePayloadPath(path, `${label}.settingPaths.${key}`, errors, true);
            });
        }
    }

    if (value.outputPaths != null) {
        if (!isObject(value.outputPaths)) {
            errors.push(`${label}.outputPaths باید object باشد.`);
        } else {
            if (value.outputPaths.images != null) {
                validateOutputPathList(value.outputPaths.images, `${label}.outputPaths.images`, errors);
            }
            if (value.outputPaths.video != null) {
                validateOutputPathList(value.outputPaths.video, `${label}.outputPaths.video`, errors);
            }
        }
    }

    return Array.from(new Set(errors));
}

export function parseRequestProfileText(
    text: string,
    label = 'requestProfile',
): ProviderRequestProfile | undefined {
    if (!text.trim()) return undefined;
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error(`${label} JSON معتبر نیست.`);
    }
    const errors = validateRequestProfile(parsed, label);
    if (errors.length) throw new Error(errors[0]);
    return parsed as ProviderRequestProfile;
}

export function formatRequestProfile(value: unknown): string {
    if (value == null) return '';
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '';
    }
}
