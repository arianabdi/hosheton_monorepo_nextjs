import {
    DEFAULT_LANGUAGE,
    FALLBACK_LANGUAGE,
    isAppLanguage,
    type AppLanguage,
} from './config';

/** Official / majority language mapped onto the 10 locales we ship. */
const COUNTRY_TO_LANGUAGE: Record<string, AppLanguage> = {
    IR: 'fa',
    AF: 'fa',
    TJ: 'fa',

    SA: 'ar',
    AE: 'ar',
    QA: 'ar',
    KW: 'ar',
    BH: 'ar',
    OM: 'ar',
    YE: 'ar',
    IQ: 'ar',
    SY: 'ar',
    JO: 'ar',
    LB: 'ar',
    PS: 'ar',
    EG: 'ar',
    LY: 'ar',
    TN: 'ar',
    DZ: 'ar',
    MA: 'ar',
    SD: 'ar',
    MR: 'ar',
    DJ: 'ar',
    SO: 'ar',
    EH: 'ar',

    ES: 'es',
    MX: 'es',
    GT: 'es',
    HN: 'es',
    SV: 'es',
    NI: 'es',
    CR: 'es',
    PA: 'es',
    CU: 'es',
    DO: 'es',
    PR: 'es',
    CO: 'es',
    VE: 'es',
    EC: 'es',
    PE: 'es',
    BO: 'es',
    PY: 'es',
    CL: 'es',
    AR: 'es',
    UY: 'es',
    GQ: 'es',

    DE: 'de',
    AT: 'de',
    LI: 'de',
    CH: 'de',

    FR: 'fr',
    MC: 'fr',
    BE: 'fr',
    LU: 'fr',
    SN: 'fr',
    CI: 'fr',
    ML: 'fr',
    BF: 'fr',
    NE: 'fr',
    TG: 'fr',
    BJ: 'fr',
    GA: 'fr',
    CG: 'fr',
    CD: 'fr',
    CM: 'fr',
    MG: 'fr',
    HT: 'fr',
    GN: 'fr',
    RW: 'fr',
    BI: 'fr',
    TD: 'fr',
    CF: 'fr',

    RU: 'ru',
    BY: 'ru',
    KZ: 'ru',
    KG: 'ru',

    JP: 'ja',

    CN: 'zh',
    TW: 'zh',
    HK: 'zh',
    MO: 'zh',

    TR: 'tr',
    AZ: 'tr',

    US: 'en',
    GB: 'en',
    AU: 'en',
    NZ: 'en',
    IE: 'en',
    CA: 'en',
    IN: 'en',
    PK: 'en',
    NG: 'en',
    ZA: 'en',
    PH: 'en',
    SG: 'en',
    MY: 'en',
    KE: 'en',
    GH: 'en',
    TZ: 'en',
    UG: 'en',
    JM: 'en',
    TT: 'en',
    MT: 'en',
};

const UNKNOWN_COUNTRY = new Set(['', 'XX', 'T1', 'ZZ']);

export function normalizeCountryCode(value: string | null | undefined): string | null {
    if (!value) return null;
    const code = value.trim().toUpperCase();
    if (UNKNOWN_COUNTRY.has(code) || code.length !== 2) return null;
    return code;
}

export function languageFromCountry(country: string | null | undefined): AppLanguage | null {
    const code = normalizeCountryCode(country);
    if (!code) return null;
    return COUNTRY_TO_LANGUAGE[code] || null;
}

export function languageFromAcceptLanguage(header: string | null | undefined): AppLanguage | null {
    if (!header) return null;

    const parsed = header
        .split(',')
        .map((part) => {
            const [tag, ...params] = part.trim().split(';');
            const qParam = params.find((item) => item.trim().startsWith('q='));
            const quality = qParam ? Number(qParam.trim().slice(2)) : 1;
            const code = tag.trim().toLowerCase().split('-')[0];
            return {code, quality: Number.isFinite(quality) ? quality : 0};
        })
        .sort((a, b) => b.quality - a.quality);

    for (const {code} of parsed) {
        if (isAppLanguage(code)) return code;
    }
    return null;
}

export function resolveRequestLanguage(input: {
    country?: string | null;
    acceptLanguage?: string | null;
}): AppLanguage {
    const fromCountry = languageFromCountry(input.country);
    if (fromCountry) return fromCountry;

    // When geo is unknown, prefer the market default (fa) over browser Accept-Language.
    // English browsers in Iran were incorrectly forcing `en` before IP/country resolved.
    const fromHeader = languageFromAcceptLanguage(input.acceptLanguage);
    if (fromHeader === DEFAULT_LANGUAGE) return fromHeader;

    if (normalizeCountryCode(input.country)) {
        return FALLBACK_LANGUAGE;
    }

    return DEFAULT_LANGUAGE;
}

export function countryFromRequestHeaders(headers: Headers): string | null {
    return normalizeCountryCode(
        headers.get('cf-ipcountry') ||
            headers.get('x-vercel-ip-country') ||
            headers.get('cloudfront-viewer-country') ||
            headers.get('x-country-code') ||
            headers.get('x-appengine-country') ||
            headers.get('x-geo-country') ||
            headers.get('geoip-country-code') ||
            headers.get('x-akamai-edgescape')?.match(/country_code=([A-Z]{2})/i)?.[1],
    );
}
