'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuMaximize2, LuTriangleAlert } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import type { CostEstimateResult } from './CostEstimatePanel';
import styles from './CostFormulaExplainer.module.scss';

/** Mirrors `ModelFormulaExplainNode` from the API cost engine (`costFormulaTree` / `tokenFormulaTree`). */
type ExplainNode =
    | { t: 'value'; label: string; key?: string; source: 'constant' | 'setting' | 'runtime'; value: number; fallback?: boolean }
    | {
        t: 'lookup';
        label: string;
        key: string;
        source: 'setting' | 'runtime';
        match: string;
        value: number;
        fallback?: boolean;
        table: Record<string, number>;
    }
    | {
        t: 'op';
        label?: string;
        operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'max' | 'min';
        value: number;
        operands: ExplainNode[];
        divByZero?: boolean;
    };

type FormulaExplain = {
    resultType: 'vendor_cost_usd' | 'output_tokens';
    root: ExplainNode;
    raw: number;
    quantity: number;
    rounding: 'round' | 'ceil' | 'floor' | 'none';
    result: number;
    expressionText?: string;
};

type LeafNode = Extract<ExplainNode, { t: 'value' | 'lookup' }>;
type OpNode = Extract<ExplainNode, { t: 'op' }>;

const OPERATOR_SYMBOL: Record<OpNode['operator'], string> = {
    add: '+',
    subtract: '−',
    multiply: '×',
    divide: '÷',
    max: 'max',
    min: 'min',
};

/** max / min are written as calls — `max(a, b)` — not between their operands. */
function isFunctionOp(node: OpNode): boolean {
    return node.operator === 'max' || node.operator === 'min';
}

/** One step with its numbers: `a × b` for arithmetic, `max(a, b)` for functions. */
function opMath(node: OpNode): string {
    const values = node.operands.map((operand) => formatFormulaNumber(operand.value));
    return isFunctionOp(node)
        ? `${node.operator}(${values.join(', ')})`
        : values.join(` ${OPERATOR_SYMBOL[node.operator]} `);
}

function parseExplain(raw: unknown): FormulaExplain | null {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
        const parsed = JSON.parse(raw) as FormulaExplain;
        return parsed?.root ? parsed : null;
    } catch {
        return null;
    }
}

/** 6 significant digits, no trailing zeros, thousands separators for big integers. */
export function formatFormulaNumber(value: number): string {
    if (!Number.isFinite(value)) return '—';
    if (Number.isInteger(value)) return value.toLocaleString('en-US');
    return Number(value.toPrecision(6)).toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function formatUsdPrecise(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return `$${Number(value.toPrecision(6)).toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

function collectLeaves(node: ExplainNode, out: LeafNode[] = []): LeafNode[] {
    if (node.t === 'op') node.operands.forEach((operand) => collectLeaves(operand, out));
    else out.push(node);
    return out;
}

/** Post-order: inner operations first, so every step only uses numbers already shown. */
function collectOps(node: ExplainNode, out: OpNode[] = []): OpNode[] {
    if (node.t !== 'op') return out;
    node.operands.forEach((operand) => collectOps(operand, out));
    out.push(node);
    return out;
}

/** Path of a node in the tree: root = "r", children = "r.0", "r.1.0", … */
function nodeAt(root: ExplainNode, path: string): ExplainNode | null {
    const parts = path.split('.').slice(1);
    let node: ExplainNode | undefined = root;
    for (const part of parts) {
        if (!node || node.t !== 'op') return null;
        node = node.operands[Number(part)];
    }
    return node || null;
}

type FocusControl = {
    path: string | null;
    toggle: (path: string) => void;
};

/** The expression with every input as a labelled chip — `(Duration 6 × rate 0.4) × Audio[on] 2`. */
function FormulaExpression({
    node,
    path = 'r',
    nested = false,
    focus,
}: {
    node: ExplainNode;
    path?: string;
    nested?: boolean;
    /** Only in the modal: parentheses become buttons that highlight their whole range. */
    focus?: FocusControl;
}) {
    const { t } = useTranslation('projects');
    if (node.t !== 'op') {
        return (
            <span className={`${styles.term} ${node.fallback ? styles.termWarn : ''}`}>
                <span className={styles.termLabel}>
                    {node.label}
                    {node.t === 'lookup' ? <span className={styles.termMatch}>[{node.match || '∅'}]</span> : null}
                </span>
                <span className={styles.termValue}>{formatFormulaNumber(node.value)}</span>
            </span>
        );
    }
    const focused = focus?.path === path;
    const paren = (char: string) => (focus ? (
        <button
            type="button"
            className={styles.parenBtn}
            onClick={() => focus.toggle(path)}
            aria-pressed={focused}
            title={t('cost_focus_paren')}
        >
            {char}
        </button>
    ) : (
        <span className={styles.paren}>{char}</span>
    ));

    // max(…) / min(…) always keep their own parentheses, arguments split by commas
    if (isFunctionOp(node)) {
        return (
            <span className={`${styles.group} ${focused ? styles.groupFocused : ''}`} data-formula-path={path}>
                <span className={styles.operator}>{node.operator}</span>
                {paren('(')}
                {node.operands.map((operand, index) => (
                    <Fragment key={index}>
                        {index > 0 ? <span className={styles.operator}>,</span> : null}
                        <FormulaExpression node={operand} path={`${path}.${index}`} nested focus={focus} />
                    </Fragment>
                ))}
                {paren(')')}
            </span>
        );
    }

    const parts = node.operands.map((operand, index) => (
        <Fragment key={index}>
            {index > 0 ? <span className={styles.operator}>{OPERATOR_SYMBOL[node.operator]}</span> : null}
            <FormulaExpression node={operand} path={`${path}.${index}`} nested focus={focus} />
        </Fragment>
    ));
    if (!nested) return <>{parts}</>;

    return (
        <span className={`${styles.group} ${focused ? styles.groupFocused : ''}`} data-formula-path={path}>
            {paren('(')}
            {parts}
            {paren(')')}
        </span>
    );
}

function FormulaResult({ tree }: { tree: FormulaExplain }) {
    return (
        <span className={styles.equals}>
            {tree.resultType === 'vendor_cost_usd'
                ? formatUsdPrecise(Math.max(0, tree.root.value))
                : formatFormulaNumber(Math.max(0, tree.root.value))}
        </span>
    );
}

/**
 * در پنجره کوچک فرمول در یک خط با اسکرول افقی؛ دکمه گوشه باکس، فرمول را در
 * ModalHelper (موبایل: BottomSheet) بزرگ‌تر و با امکان انتخاب پرانتزها نشان می‌دهد.
 */
function FormulaSection({ tree }: { tree: FormulaExplain }) {
    const { t } = useTranslation('projects');
    const [expanded, setExpanded] = useState(false);
    const title = tree.resultType === 'vendor_cost_usd' ? t('cost_explain_formula') : t('cost_explain_token_formula');

    return (
        <Section title={title}>
            <div className={styles.expressionBox}>
                <div className={`${styles.expression} ${styles.expressionLine}`} dir="ltr">
                    <FormulaExpression node={tree.root} />
                    <span className={styles.operator}>=</span>
                    <FormulaResult tree={tree} />
                </div>
                <button
                    type="button"
                    className={styles.expandBtn}
                    onClick={() => setExpanded(true)}
                    aria-label={t('cost_formula_expand')}
                    title={t('cost_formula_expand')}
                >
                    <LuMaximize2 size={12} />
                </button>
            </div>
            {tree.expressionText ? (
                <p className={styles.adminText}>
                    <span>{t('cost_admin_text')}</span>
                    <code dir="ltr">{tree.expressionText}</code>
                </p>
            ) : null}
            <ModalHelper
                open={expanded}
                onClose={() => setExpanded(false)}
                size="lg"
                sheetTitle={title}
                component={expanded ? <FormulaModal tree={tree} title={title} /> : null}
            />
        </Section>
    );
}

/** محتوای مودال فرمول: نوار یک‌خطی قابل اسکرول + انتخاب پرانتز + خلاصه نتیجه */
function FormulaModal({ tree, title }: { tree: FormulaExplain; title: string }) {
    const { t } = useTranslation('projects');
    const [focusPath, setFocusPath] = useState<string | null>(null);
    const stripRef = useRef<HTMLDivElement>(null);

    const toggle = (path: string) => setFocusPath((current) => (current === path ? null : path));

    // بخش انتخاب‌شده را داخل نوار اسکرول افقی در دید بیاور
    useEffect(() => {
        if (!focusPath) return;
        const el = stripRef.current?.querySelector<HTMLElement>(`[data-formula-path="${focusPath}"]`);
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }, [focusPath]);

    const focused = focusPath ? nodeAt(tree.root, focusPath) : null;
    const focusedOp = focused?.t === 'op' ? focused : null;
    const groupCount = collectOps(tree.root).length - 1;

    return (
        // پنجره شناور cost estimate با کلیک بیرون بسته می‌شود؛ این نشانگر می‌گوید مودال فرمول باز است
        <div className={styles.modal} data-cost-formula-modal>
            <header className={styles.modalHead}>
                <h4>{title}</h4>
                <p>{groupCount > 0 ? t('cost_focus_hint') : t('cost_focus_hint_flat')}</p>
            </header>

            <div className={styles.modalBody}>
                <div
                    ref={stripRef}
                    className={`${styles.expression} ${styles.expressionLine} ${styles.expressionLarge} ${focusPath ? styles.hasFocus : ''}`}
                    dir="ltr"
                >
                    <FormulaExpression node={tree.root} focus={{ path: focusPath, toggle }} />
                    <span className={styles.operator}>=</span>
                    <FormulaResult tree={tree} />
                </div>

                {groupCount > 0 ? (
                    <div className={`${styles.focusBar} ${focusedOp ? styles.focusBarActive : ''}`} aria-live="polite">
                        {focusedOp ? (
                            <>
                                <div className={styles.focusInfo}>
                                    <span className={styles.focusTitle}>{focusedOp.label || t('cost_focus_selected')}</span>
                                    <span className={styles.focusMath} dir="ltr">
                                        {opMath(focusedOp)}
                                        {' = '}
                                        <b>{formatFormulaNumber(focusedOp.value)}</b>
                                    </span>
                                </div>
                                <button type="button" className={styles.focusClear} onClick={() => setFocusPath(null)}>
                                    {t('cost_focus_clear')}
                                </button>
                            </>
                        ) : (
                            <span className={styles.focusEmpty}>{t('cost_focus_none')}</span>
                        )}
                    </div>
                ) : null}

                <dl className={styles.modalMeta}>
                    {tree.expressionText ? (
                        <div className={styles.modalMetaWide}>
                            <dt>{t('cost_admin_text')}</dt>
                            <dd><code dir="ltr">{tree.expressionText}</code></dd>
                        </div>
                    ) : null}
                    <div>
                        <dt>{t('cost_step_raw')}</dt>
                        <dd dir="ltr">{formatFormulaNumber(tree.raw)}</dd>
                    </div>
                    <div>
                        <dt>{t('cost_step_quantity')}</dt>
                        <dd dir="ltr">{formatFormulaNumber(tree.quantity)}</dd>
                    </div>
                    <div>
                        <dt>{tree.resultType === 'vendor_cost_usd' ? t('cost_step_vendor') : t('cost_step_tokens')}</dt>
                        <dd dir="ltr">
                            <b>
                                {tree.resultType === 'vendor_cost_usd'
                                    ? formatUsdPrecise(tree.result)
                                    : formatFormulaNumber(tree.result)}
                            </b>
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}

function Row({ label, hint, value, tone }: { label: ReactNode; hint?: ReactNode; value: ReactNode; tone?: 'muted' | 'strong' | 'profit' }) {
    return (
        <div className={`${styles.row} ${tone ? styles[`row_${tone}`] : ''}`}>
            <span className={styles.rowLabel}>
                {label}
                {hint ? <small>{hint}</small> : null}
            </span>
            <span className={styles.rowValue} dir="ltr">{value}</span>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className={styles.section}>
            <h5 className={styles.sectionTitle}>{title}</h5>
            {children}
        </section>
    );
}

/**
 * Explains, step by step, how a cost estimate was produced: the configured formula with
 * real values, where each input came from, intermediate results, quantity/rounding and
 * the markup that turns vendor cost into the user charge.
 */
export function CostFormulaExplainer({ result }: { result: CostEstimateResult }) {
    const { t } = useTranslation('projects');
    const breakdown = result.breakdown || {};
    const costTree = parseExplain(breakdown.costFormulaTree);
    const tokenTree = parseExplain(breakdown.tokenFormulaTree);
    const tree = costTree || tokenTree;

    const vendor = Number(result.vendorCostUsd ?? breakdown.formulaVendorCostUsd ?? NaN);
    const charged = Number(result.chargedUsd ?? result.amount);
    const markup = Number(result.markupPercent ?? NaN);
    const warnings = [
        breakdown.warning,
        breakdown.formulaWarning,
        breakdown.tokenEstimatorWarning,
        breakdown.tokenEstimatorError,
        breakdown.error,
    ]
        .filter((item) => typeof item === 'string' && item.trim()) as string[];

    const sourceLabel = (leaf: LeafNode) => (leaf.t === 'lookup'
        ? t('cost_src_lookup')
        : t(`cost_src_${leaf.source}`));

    const leaves = tree ? collectLeaves(tree.root) : [];
    const ops = tree ? collectOps(tree.root) : [];
    const legacyTrace = !tree ? String(breakdown.costFormula || breakdown.tokenFormula || '') : '';

    return (
        <div className={styles.explainer}>
            <p className={styles.mode}>
                {t(`cost_mode_${modeKey(String(breakdown.mode || result.pricingMode || ''), Boolean(costTree))}`)}
                {result.modelName ? <span> · {result.modelName}</span> : null}
            </p>

            {warnings.length ? (
                <ul className={styles.warnings}>
                    {warnings.map((item) => (
                        <li key={item}><LuTriangleAlert size={13} aria-hidden /> <span dir="ltr">{item}</span></li>
                    ))}
                </ul>
            ) : null}

            {tree ? (
                <>
                    <FormulaSection tree={tree} />

                    <Section title={t('cost_explain_inputs')}>
                        {leaves.map((leaf, index) => (
                            <div key={`${leaf.label}-${index}`} className={styles.input}>
                                <Row
                                    label={leaf.label}
                                    hint={(
                                        <>
                                            {sourceLabel(leaf)}
                                            {leaf.key && leaf.key !== leaf.label ? <code dir="ltr">{leaf.key}</code> : null}
                                        </>
                                    )}
                                    value={leaf.t === 'lookup'
                                        ? <>{leaf.match || t('cost_lookup_missing')} → <b>{formatFormulaNumber(leaf.value)}</b></>
                                        : <b>{formatFormulaNumber(leaf.value)}</b>}
                                />
                                {leaf.fallback ? (
                                    <p className={styles.inputWarn}><LuTriangleAlert size={12} aria-hidden /> {t('cost_fallback')}</p>
                                ) : null}
                                {leaf.t === 'lookup' && Object.keys(leaf.table).length > 1 ? (
                                    <div className={styles.table} dir="ltr">
                                        {Object.entries(leaf.table).map(([option, weight]) => (
                                            <span
                                                key={option}
                                                className={option.toLowerCase().trim() === leaf.match ? styles.tableActive : ''}
                                            >
                                                {option} <b>{formatFormulaNumber(weight)}</b>
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </Section>

                    {ops.length > 1 || ops.some((op) => op.divByZero) ? (
                        <Section title={t('cost_explain_steps')}>
                            <ol className={styles.steps}>
                                {ops.map((op, index) => (
                                    <li key={index}>
                                        {op.label ? <span className={styles.stepLabel}>{op.label}</span> : null}
                                        <span dir="ltr" className={styles.stepMath}>
                                            {opMath(op)}
                                            {' = '}
                                            <b>{formatFormulaNumber(op.value)}</b>
                                        </span>
                                        {op.divByZero ? <span className={styles.inputWarn}>{t('cost_div_zero')}</span> : null}
                                    </li>
                                ))}
                            </ol>
                        </Section>
                    ) : null}
                </>
            ) : legacyTrace ? (
                <Section title={t('cost_explain_inputs')}>
                    <p className={styles.legacy}>{t('cost_explain_legacy')}</p>
                    <code className={styles.trace} dir="ltr">{legacyTrace}</code>
                </Section>
            ) : null}

            <Section title={t('cost_explain_result')}>
                {tree ? (
                    <>
                        <Row label={t('cost_step_raw')} value={formatFormulaNumber(tree.raw)} tone="muted" />
                        {tree.quantity !== 1 ? (
                            <Row label={t('cost_step_quantity')} value={`× ${formatFormulaNumber(tree.quantity)}`} tone="muted" />
                        ) : null}
                        {tree.rounding !== 'none' && tree.result !== tree.raw * tree.quantity ? (
                            <Row label={t('cost_step_rounding', { mode: tree.rounding })} value={formatFormulaNumber(tree.result)} tone="muted" />
                        ) : null}
                        {tree.resultType === 'output_tokens' ? (
                            <Row label={t('cost_step_tokens')} value={formatFormulaNumber(tree.result)} />
                        ) : null}
                    </>
                ) : null}
                <NonFormulaRows breakdown={breakdown} skip={Boolean(costTree)} />
                {Number.isFinite(vendor) ? (
                    <Row label={t('cost_step_vendor')} value={formatUsdPrecise(vendor)} />
                ) : null}
                {Number.isFinite(markup) && markup > 0 ? (
                    <Row
                        label={t('cost_step_markup', { percent: formatFormulaNumber(markup) })}
                        value={`+ ${formatUsdPrecise(Number(result.profitUsd ?? (charged - vendor)))}`}
                        tone="profit"
                    />
                ) : null}
                <Row label={t('cost_step_charged')} value={formatUsdPrecise(charged)} tone="strong" />
            </Section>
        </div>
    );
}

function modeKey(mode: string, formula: boolean): 'formula' | 'token' | 'matrix' | 'unit' {
    if (formula || mode === 'formula') return 'formula';
    if (mode === 'token') return 'token';
    if (mode === 'matrix') return 'matrix';
    return 'unit';
}

/** Token / matrix / per-unit pricing: show the rate × quantity that produced the vendor cost. */
function NonFormulaRows({ breakdown, skip }: { breakdown: Record<string, unknown>; skip: boolean }) {
    const { t } = useTranslation('projects');
    if (skip) return null;
    const num = (key: string) => {
        const value = Number(breakdown[key]);
        return Number.isFinite(value) ? value : null;
    };
    const rows: ReactNode[] = [];

    if (breakdown.mode === 'token') {
        const inputTokens = num('inputTokens');
        const outputTokens = num('outputTokens');
        if (inputTokens != null) {
            rows.push(<Row key="in" label={t('cost_input_tokens')} hint={formatFormulaNumber(inputTokens)} value={formatUsdPrecise(num('inputCost') ?? 0)} tone="muted" />);
        }
        if (outputTokens != null) {
            rows.push(<Row key="out" label={t('cost_output_tokens')} hint={formatFormulaNumber(outputTokens)} value={formatUsdPrecise(num('outputCost') ?? 0)} tone="muted" />);
        }
        if ((num('cacheCost') ?? 0) > 0) {
            rows.push(<Row key="cache" label={t('cost_cache')} value={formatUsdPrecise(num('cacheCost') ?? 0)} tone="muted" />);
        }
    } else if (breakdown.mode === 'matrix' && num('rowPrice') != null) {
        const matchType = String(breakdown.matchType || 'exact');
        let dims = '';
        try {
            dims = Object.entries(JSON.parse(String(breakdown.matchedDims || '{}')) as Record<string, string>)
                .map(([key, value]) => `${key}=${value}`).join(', ');
        } catch {
            dims = String(breakdown.matchedDims || '');
        }
        rows.push(
            <Row
                key="row"
                label={t('cost_matched_row')}
                hint={t(`cost_match_${matchType}`, { defaultValue: matchType })}
                value={dims || '—'}
                tone="muted"
            />,
        );
        rows.push(
            <Row
                key="price"
                label={`${formatUsdPrecise(num('rowPrice') ?? 0)} / ${String(breakdown.per || '')}`}
                value={`× ${formatFormulaNumber(num('units') ?? 0)}`}
                tone="muted"
            />,
        );
    } else if (num('unitAmount') != null) {
        rows.push(
            <Row
                key="unit"
                label={`${formatUsdPrecise(num('unitAmount') ?? 0)} / ${String(breakdown.per || '')}`}
                value={`× ${formatFormulaNumber(num('units') ?? 0)}`}
                tone="muted"
            />,
        );
    }
    return <>{rows}</>;
}
