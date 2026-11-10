'use client';

import React from 'react';
import styles from '../Documents.module.scss';

export interface WizardStepDef {
    id: string;
    label: string;
}

interface WorkflowWizardShellProps {
    steps: WizardStepDef[];
    currentStep: number;
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export default function WorkflowWizardShell({
    steps,
    currentStep,
    title,
    subtitle,
    children,
    footer,
}: WorkflowWizardShellProps) {
    const progress = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 100;

    return (
        <div className={styles.wizard}>
            {title ? <h3 className={styles.wizardTitle}>{title}</h3> : null}
            {subtitle ? <p className={styles.wizardSubtitle}>{subtitle}</p> : null}
            <nav className={styles.wizardStepper} aria-label="مراحل">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const done = stepNumber < currentStep;
                    const active = stepNumber === currentStep;
                    return (
                        <div
                            key={step.id}
                            className={`${styles.wizardStepItem} ${done ? styles.wizardStepDone : ''} ${active ? styles.wizardStepActive : ''}`}
                        >
                            <span className={styles.wizardStepIndex}>{stepNumber}</span>
                            <span className={styles.wizardStepLabel}>{step.label}</span>
                        </div>
                    );
                })}
            </nav>
            <div className={styles.wizardProgressBar}>
                <div className={styles.wizardProgressFill} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.wizardBody}>{children}</div>
            {footer ? <div className={styles.wizardFooter}>{footer}</div> : null}
        </div>
    );
}

interface WizardFooterProps {
    onBack?: () => void;
    onNext?: () => void;
    onCancel?: () => void;
    backLabel?: string;
    nextLabel?: string;
    cancelLabel?: string;
    nextDisabled?: boolean;
    showBack?: boolean;
    showCancel?: boolean;
}

export function WizardFooter({
    onBack,
    onNext,
    onCancel,
    backLabel = 'قبلی',
    nextLabel = 'بعدی',
    cancelLabel = 'انصراف',
    nextDisabled = false,
    showBack = true,
    showCancel = true,
}: WizardFooterProps) {
    return (
        <>
            {showCancel && onCancel ? (
                <button type="button" className={styles.wizardSecondaryBtn} onClick={onCancel}>
                    {cancelLabel}
                </button>
            ) : (
                <span />
            )}
            <div className={styles.wizardFooterEnd}>
                {showBack && onBack ? (
                    <button type="button" className={styles.wizardSecondaryBtn} onClick={onBack}>
                        {backLabel}
                    </button>
                ) : null}
                {onNext ? (
                    <button
                        type="button"
                        className={styles.wizardPrimaryBtn}
                        disabled={nextDisabled}
                        onClick={onNext}
                    >
                        {nextLabel}
                    </button>
                ) : null}
            </div>
        </>
    );
}

export { WorkflowPathPreview, HrCatalogEmptyHint } from './WorkflowPathPreview';
export type { WorkflowPathStepPreview } from './WorkflowPathPreview';
