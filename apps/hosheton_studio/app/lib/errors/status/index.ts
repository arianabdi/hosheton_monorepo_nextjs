// بنر وضعیت سراسری (قطع اینترنت، در دسترس نبودن سرور…) — راهنما: AGENTS.md اپ، بخش «نمایش خطا»
export { STATUS_ISSUES, type StatusIssueId, type StatusIssueDefinition } from './issues';
export { detectStatusIssue } from './detect';
export {
    useStatusStore,
    reportStatusIssue,
    markServerReachable,
    retryStatusNow,
    onStatusRecovered,
    hasActiveStatusIssue,
    type StatusPhase,
} from './statusStore';
export { default as StatusBanner } from './StatusBanner';
export { useStatusRecovery } from './useStatusRecovery';
