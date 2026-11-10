'use client';

import React, {useEffect, useState, useTransition, useMemo, useRef, useCallback} from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import styles from './JsonEditor.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";

// --- ROBUST FLATTENING & UNFLATTENING (Handles Arrays of Objects) ---
function flattenObject(obj: any, prefix = '', res: Record<string, any> = {}): Record<string, any> {
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

        const propName = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value !== null && typeof value === 'object') {
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    // Keep empty arrays as primitive values
                    res[propName] = [];
                } else {
                    // Check if the array contains objects or primitives
                    value.forEach((item, index) => {
                        if (item !== null && typeof item === 'object') {
                            flattenObject(item, `${propName}.${index}`, res);
                        } else {
                            res[`${propName}.${index}`] = item;
                        }
                    });
                }
            } else {
                // It's a standard nested object
                flattenObject(value, propName, res);
            }
        } else {
            res[propName] = value;
        }
    }
    return res;
}

function unflattenObject(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

        const parts = key.split('.');
        let current = result;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Check if the next part is an array index (a valid integer string)
            const nextPart = parts[i + 1];
            const isNextAnArrayIndex = nextPart !== undefined && /^\d+$/.test(nextPart);

            if (i === parts.length - 1) {
                current[part] = data[key];
            } else {
                if (current[part] === undefined) {
                    current[part] = isNextAnArrayIndex ? [] : {};
                }
                current = current[part];
            }
        }
    }
    return result;
}

// --- OPTIMIZED DEBOUNCED INPUT ROW ---
interface InputRowProps {
    path: string;
    value: any;
    onChange: (path: string, val: any) => void;
}
interface JsonEditorProps {
    data: any,
    loading: boolean,
    title: string,
    description: string,
    handleSubmit: (newData) => void
}

const InputRow: React.FC<InputRowProps> = React.memo(({ path, value, onChange }) => {
    const [localValue, setLocalValue] = useState(value ?? '');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync if external data shifts
    useEffect(() => {
        setLocalValue(value ?? '');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onChange(path, val);
        }, 300); // 300ms debounce prevents lagging the main tree
    };

    const handleBlur = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onChange(path, localValue);
    };

    const displayKey = path.split('.').pop() || path;

    return (
        <div className={styles.inputRow}>
            <label className={styles.fieldLabel} title={path}>{displayKey}</label>
            <input
                type="text"
                className={styles.fieldInput}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
            />
        </div>
    );
});
InputRow.displayName = 'InputRow';

// --- MAIN COMPONENT ---
const JsonEditor: React.FC<JsonEditorProps> = ({data, loading, title, description, handleSubmit}) => {
    const [flatData, setFlatData] = useState<Record<string, any>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);
    const [isPending, startTransition] = useTransition();

    const systemFields = useMemo(() =>
            ['_id', 'id', 'wordId', 'createdAt', 'updatedAt', '__v', 'isAlive', '$oid', '$date'],
        []);


    useEffect(()=>{
        console.log('datadatadata', data)
        if(data){
            const flattened = flattenObject(data);
            // Filter out system keys right at processing time
            const filtered: Record<string, any> = {};
            for (const k in flattened) {
                if (!systemFields.some(field => k.endsWith(field) || k.includes(`.${field}.`))) {
                    filtered[k] = flattened[k];
                }
            }
            setFlatData(filtered);

            // Initialize all parent sections to expanded
            const initialExpanded: Record<string, boolean> = {};
            Object.keys(filtered).forEach(path => {
                const parts = path.split('.');
                if (parts.length > 1) {
                    for (let i = 1; i < parts.length; i++) {
                        const parentPath = parts.slice(0, i).join('.');
                        initialExpanded[parentPath] = true;
                    }
                }
            });
            setExpandedSections(initialExpanded);
        }
    },[data])


    // Fast state update without deeply mutating deep objects
    const handleValueChange = useCallback((path: string, newValue: any) => {
        startTransition(() => {
            setFlatData(prev => ({
                ...prev,
                [path]: newValue
            }));
        });
    }, []);

    const toggleSection = (sectionPath: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionPath]: !prev[sectionPath]
        }));
    };

    // Parse the flat keys into a nested structure for UI grouping render
    const structuredTree = useMemo(() => {
        const tree: any = {};
        Object.keys(flatData).forEach(path => {
            const parts = path.split('.');
            let current = tree;
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    current[part] = { __isField: true, path, value: flatData[path] };
                } else {
                    current[part] = current[part] || { __isField: false };
                    current = current[part];
                }
            });
        });
        return tree;
    }, [flatData]);


    // Recursive UI Node Generator that handles nesting & sticky headers
    const renderTreeNodes = (node: any, currentPath = '', level = 0) => {
        return Object.keys(node).map(key => {
            if (key === '__isField') return null;
            const childNode = node[key];
            const nodePath = currentPath ? `${currentPath}.${key}` : key;

            if (childNode.__isField) {
                return (
                    <InputRow
                        key={nodePath}
                        path={nodePath}
                        value={childNode.value}
                        onChange={handleValueChange}
                    />
                );
            }

            const isExpanded = expandedSections[nodePath] !== false;

            return (
                <div
                    key={nodePath}
                    className={styles.sectionGroup}
                    style={{ '--nesting-level': level } as React.CSSProperties}
                >
                    {/* The Sticky Header Wrapper */}
                    <div
                        className={styles.stickyHeader}
                        style={{ top: `${level * 40}px`, zIndex: 10 - level }}
                        onClick={() => toggleSection(nodePath)}
                    >
                        <span className={`${styles.arrow} ${isExpanded ? styles.expanded : ''}`}>❯</span>
                        <span className={styles.headerTitle}>{key}</span>
                        <span className={styles.pathBadge}>{nodePath}</span>
                    </div>

                    {/* Section Content */}
                    {isExpanded && (
                        <div className={styles.sectionContent}>
                            {renderTreeNodes(childNode, nodePath, level + 1)}
                        </div>
                    )
                    }
                </div>
            );
        });
    };

    if (loading) {
        return (
            <Container>
                <Wrapper><p className={styles.loadingState}>در حال بارگذاری ساختار متادیتای ترجمه...</p></Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper style={{paddingTop: '0px'}}>
                <div className={styles.editorContainer} dir="rtl">
                    <header className={styles.editorHeader}>
                        <h1>{title}</h1>
                        <p>{description}</p>
                    </header>

                    <div className={styles.treeViewport}>
                        {renderTreeNodes(structuredTree)}
                    </div>

                    <footer className={styles.editorActions}>
                        <button
                            className={styles.saveButton}
                            onClick={()=>{handleSubmit(unflattenObject(flatData))}}
                            disabled={submitting || isPending}
                        >
                            {submitting ? 'در حال ذخیره‌سازی...' : 'ذخیره تغییرات'}
                        </button>
                    </footer>
                </div>
            </Wrapper>
        </Container>
    );
};

export default JsonEditor;