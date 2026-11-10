// نمایش واحد خطا در استودیو — راهنما: AGENTS.md همین اپ، بخش «نمایش خطا»
export {
    resolveHoshetonError,
    isCleanHoshetonText,
    mentionsProvider,
    type HoshetonErrorCode,
    type HoshetonErrorKind,
    type ResolvedHoshetonError,
} from './hoshetonErrors';
export {
    HoshetonError,
    useHoshetonError,
    getHoshetonErrorView,
    getHoshetonErrorMessage,
    describeHoshetonError,
    type HoshetonErrorView,
    type HoshetonErrorOptions,
} from './HoshetonError';
export { notifyError } from './notifyError';
// بنر وضعیت سراسری (قطع اینترنت / سرور) — به‌جای toastهای پشت‌سرهم
export {
    StatusBanner,
    reportStatusIssue,
    markServerReachable,
    retryStatusNow,
    onStatusRecovered,
    useStatusRecovery,
    hasActiveStatusIssue,
    detectStatusIssue,
    type StatusIssueId,
} from './status';
