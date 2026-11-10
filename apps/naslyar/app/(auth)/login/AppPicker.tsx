'use client'

import React, {useMemo, useState} from "react";
import Image, {StaticImageData} from "next/image";
import {Check, Search} from "lucide-react";
import styles from "./AppPicker.module.scss";

export type PickerApp = {
    _id: string;
    name: string;
    logo: StaticImageData | string;
    baseUrl: string;
};

/** Search box only appears once the list is long enough to need it. */
const SEARCH_THRESHOLD = 6;

function hostOf(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

export function AppPicker({apps, selectedId, onSelect}: {
    apps: PickerApp[];
    selectedId: string;
    onSelect: (app: PickerApp) => void;
}) {
    const [query, setQuery] = useState('');

    const visibleApps = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return apps;
        return apps.filter((app) =>
            app.name.toLowerCase().includes(q)
            || app._id.toLowerCase().includes(q)
            || app.baseUrl.toLowerCase().includes(q),
        );
    }, [apps, query]);

    return (
        <div className={styles.picker} dir="rtl">
            <div className={styles.head}>
                <span className={styles.title}>اپلیکیشن را انتخاب کنید</span>
                <span className={styles.count}>{apps.length.toLocaleString('fa-IR')} اپ در دسترس</span>
            </div>
            <p className={styles.hint}>
                ورود با حساب ادمینِ همان اپلیکیشن انجام می‌شود و پنل بر اساس آن تنظیم می‌شود.
            </p>

            {apps.length > SEARCH_THRESHOLD && (
                <label className={styles.search}>
                    <Search size={16}/>
                    <input
                        type="text"
                        value={query}
                        placeholder="جستجوی اپلیکیشن…"
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
            )}

            <ul className={styles.list} role="listbox" aria-label="اپلیکیشن‌ها">
                {visibleApps.map((app) => {
                    const selected = app._id === selectedId;
                    return (
                        <li key={app._id}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className={`${styles.row} ${selected ? styles.rowSelected : ''}`}
                                onClick={() => onSelect(app)}
                            >
                                <span className={styles.logo}>
                                    {app.logo
                                        ? <Image src={app.logo} alt="" width={32} height={32}/>
                                        : <span className={styles.initial}>{app.name.charAt(0)}</span>}
                                </span>
                                <span className={styles.text}>
                                    <span className={styles.name}>{app.name}</span>
                                    <span className={styles.host} dir="ltr">{hostOf(app.baseUrl)}</span>
                                </span>
                                <span className={styles.check}>
                                    {selected ? <Check size={18}/> : null}
                                </span>
                            </button>
                        </li>
                    );
                })}
                {visibleApps.length === 0 && (
                    <li className={styles.empty}>اپلیکیشنی با این نام پیدا نشد.</li>
                )}
            </ul>
        </div>
    );
}
