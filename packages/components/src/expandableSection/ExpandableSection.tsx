'use client'

import {useState} from "react";

import styles from "./styles.module.scss";
import {IoMdArrowDropdown, IoMdArrowDropup} from "react-icons/io";

interface ExpandableSectionProps {
    title: string;
    slug?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    headerClassName?: string;
    headerTitleClassName?: string;
    contentContainerClassName?: string;
    defaultExpanded?: boolean;
}

export function ExpandableSection({
    title,
    slug,
    icon,
    children,
    headerClassName,
    headerTitleClassName,
    contentContainerClassName,
    defaultExpanded = false,
}: ExpandableSectionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className={styles.section}>
            <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className={`${styles.header} ${headerClassName || ''}`}
                aria-expanded={expanded}
            >
                <div className={styles.titleContainer}>
                    <div>
                        {icon}
                        <span className={`${styles.title} ${headerTitleClassName || ''}`}>{title}</span>
                    </div>
                    {slug ? (
                        <div>
                            <span className={styles.slug}>{slug}</span>
                        </div>
                    ) : null}
                </div>
                {expanded ? (
                    <IoMdArrowDropup color={'var(--body-text-color)'} className={styles.arrow}/>
                ) : (
                    <IoMdArrowDropdown color={'var(--body-text-color)'} className={styles.arrow}/>
                )}
            </button>
            {expanded ? (
                <div className={`${styles.content} ${contentContainerClassName || ''}`}>{children}</div>
            ) : null}
        </div>
    );
}
