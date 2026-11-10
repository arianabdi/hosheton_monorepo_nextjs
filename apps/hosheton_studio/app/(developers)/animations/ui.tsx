'use client';

import { LuCopy } from 'react-icons/lu';
import { CAT_VARIANT_GROUPS, type CatFlag } from '../projects/[projectId]/chat/chatInput/cat/debug';
import { CAT_DIR, FLAG_LABELS } from './catalog';
import { useInspector } from './inspector';
import styles from './Animations.module.scss';

/* اجزای کوچک مشترک صفحهٔ «انیمیشن‌ها» */

type SwitchProps = {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    title?: string;
    disabled?: boolean;
};

export function Switch({ checked, onChange, label, title, disabled }: SwitchProps) {
    return (
        <label className={`${styles.switchLabel} ${disabled ? styles.switchDisabled : ''}`} title={title}>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
                onClick={() => onChange(!checked)}
            />
            <span>{label}</span>
        </label>
    );
}

/** کلید یک flag؛ در شاخه‌های دوتایی آخرین گزینهٔ روشن قفل می‌شود */
export function FlagSwitch({ flag }: { flag: CatFlag }) {
    const { debug, setFlag, tx, fa } = useInspector();
    const checked = debug.flags[flag];
    const pair = CAT_VARIANT_GROUPS.find((group) => group.includes(flag));
    let partner: CatFlag | null = null;
    if (pair) partner = pair[0] === flag ? pair[1] : pair[0];
    const locked = checked && partner !== null && !debug.flags[partner];
    return (
        <Switch
            checked={checked}
            onChange={(value) => setFlag(flag, value)}
            label={tx(FLAG_LABELS[flag])}
            disabled={locked}
            title={locked ? (fa ? 'دست‌کم یکی از دو حالت باید روشن بماند' : 'At least one of the two must stay on') : flag}
        />
    );
}

/** ارجاع به کد + دکمهٔ کپی متن کامل برای گفتگو با Claude */
export function CodeRef({ code, title, ids }: { code: string; title: string; ids?: string[] }) {
    const { copy, fa } = useInspector();
    const text = `[${fa ? 'گربهٔ چت' : 'chat cat'}] ${title}${ids?.length ? ` (${ids.join(', ')})` : ''} — ${CAT_DIR}/${code}`;
    return (
        <span className={styles.codeRef}>
            <code dir="ltr">{code}</code>
            <button
                type="button"
                className={styles.iconBtn}
                onClick={() => copy(text)}
                title={fa ? 'کپی ارجاع برای Claude' : 'Copy reference for Claude'}
                aria-label={fa ? 'کپی ارجاع' : 'Copy reference'}
            >
                <LuCopy size={13} />
            </button>
        </span>
    );
}

export function SectionHead({ title, note }: { title: string; note?: string }) {
    return (
        <div className={styles.sectionHead}>
            <h2>{title}</h2>
            {note ? <p>{note}</p> : null}
        </div>
    );
}
