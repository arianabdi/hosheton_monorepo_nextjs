'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import {
    appendAuditLog,
    createDocumentId,
    loadAccessRules,
    loadSharedLinks,
    resolveAuditActor,
    saveAccessRules,
    saveSharedLinks,
} from '../documents-api';
import type { AccessRule, SharePermission, SharedLink } from '../documents.types';
import { ACL_ROLE_LABELS } from '../documents.types';

export default function SharingPage() {
    const { baseUrl, fullname, username, email, userId } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [links, setLinks] = useState<SharedLink[]>([]);
    const [rules, setRules] = useState<AccessRule[]>([]);
    const [fileName, setFileName] = useState('');
    const [password, setPassword] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [permission, setPermission] = useState<SharePermission>('view');
    const [aclTarget, setAclTarget] = useState('');
    const [aclSubject, setAclSubject] = useState('');
    const [aclRole, setAclRole] = useState<AccessRule['role']>('viewer');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [l, r] = await Promise.all([loadSharedLinks(baseUrl, token), loadAccessRules(baseUrl, token)]);
            setLinks(l.value);
            setRules(r.value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const auditActor = useMemo(
        () => resolveAuditActor({ fullname, username, email, userId }),
        [fullname, username, email, userId],
    );

    const addLink = async () => {
        if (!token || !fileName.trim()) return;
        const tokenStr = createDocumentId('share').slice(-12);
        const link: SharedLink = {
            id: createDocumentId('lnk'),
            fileId: '',
            fileName: fileName.trim(),
            token: tokenStr,
            password: password || undefined,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
            permission,
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        const next = [link, ...links];
        await saveSharedLinks(baseUrl, token, next);
        setLinks(next);
        void appendAuditLog(baseUrl, token, {
            ...auditActor,
            action: 'share_create',
            fileName: link.fileName,
            detail: permission === 'download' ? 'دسترسی: دانلود' : 'دسترسی: مشاهده',
        }).catch(() => {});
        setFileName('');
        setPassword('');
        SuccessToaster({ message: 'لینک ایجاد شد' });
    };

    const deactivate = async (id: string) => {
        if (!token) return;
        const link = links.find((l) => l.id === id);
        const next = links.map((l) => (l.id === id ? { ...l, isActive: false } : l));
        await saveSharedLinks(baseUrl, token, next);
        setLinks(next);
        void appendAuditLog(baseUrl, token, {
            ...auditActor,
            action: 'share_deactivate',
            fileName: link?.fileName,
            detail: link?.token,
        }).catch(() => {});
    };

    const addAcl = async () => {
        if (!token || !aclTarget.trim() || !aclSubject.trim()) return;
        const rule: AccessRule = {
            id: createDocumentId('acl'),
            targetType: 'file',
            targetId: aclTarget,
            targetName: aclTarget,
            subjectType: 'role',
            subjectId: aclSubject,
            subjectName: aclSubject,
            role: aclRole,
        };
        const next = [...rules, rule];
        await saveAccessRules(baseUrl, token, next);
        setRules(next);
        void appendAuditLog(baseUrl, token, {
            ...auditActor,
            action: 'acl_add',
            fileName: rule.targetName,
            detail: `${rule.subjectName}: ${ACL_ROLE_LABELS[rule.role]}`,
        }).catch(() => {});
        setAclTarget('');
        setAclSubject('');
        SuccessToaster({ message: 'دسترسی ثبت شد' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>اشتراک‌گذاری و دسترسی‌ها</h1>
                            <p className={parentStyles.subtitle}>لینک‌های عمومی و ماتریس ACL</p>
                        </div>
                    </header>
                    <div className={parentStyles.formCard} style={{ marginBottom: '1.5rem' }}>
                        <h3 className={parentStyles.formSectionTitle}>لینک اشتراک جدید</h3>
                        <div className={parentStyles.field}><label>نام فایل</label><input value={fileName} onChange={(e) => setFileName(e.target.value)} /></div>
                        <div className={parentStyles.field}><label>رمز (اختیاری)</label><input value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                        <div className={parentStyles.field}><label>انقضا</label><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
                        <div className={parentStyles.field}>
                            <label>دسترسی</label>
                            <select value={permission} onChange={(e) => setPermission(e.target.value as SharePermission)}>
                                <option value="view">فقط مشاهده</option>
                                <option value="download">دانلود</option>
                            </select>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => void addLink()}>ایجاد لینک</button>
                    </div>
                    <div className={tabStyles.tableWrap}>
                        <table className={tabStyles.dataTable}>
                            <thead><tr><th>فایل</th><th>توکن</th><th>دسترسی</th><th>فعال</th><th>عملیات</th></tr></thead>
                            <tbody>
                                {links.length === 0 ? (
                                    <tr><td colSpan={5} className={tabStyles.emptyCell} data-label="">لینکی ثبت نشده</td></tr>
                                ) : links.map((l) => (
                                    <tr key={l.id}>
                                        <td data-label="فایل" className={tabStyles.cellPrimary}>{l.fileName}</td>
                                        <td data-label="توکن" dir="ltr" className={tabStyles.cellMuted}>{l.token}</td>
                                        <td data-label="دسترسی">{l.permission === 'download' ? 'دانلود' : 'مشاهده'}</td>
                                        <td data-label="فعال">
                                            <span className={`${tabStyles.statusBadge} ${l.isActive ? tabStyles.statusBadgeSuccess : ''}`}>
                                                {l.isActive ? 'فعال' : 'غیرفعال'}
                                            </span>
                                        </td>
                                        <td data-label="عملیات">
                                            <div className={tabStyles.rowActions}>
                                                {l.isActive && (
                                                    <button type="button" className={parentStyles.deleteBtn} onClick={() => void deactivate(l.id)}>غیرفعال</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className={parentStyles.formCard} style={{ marginTop: '1.5rem' }}>
                        <h3 className={parentStyles.formSectionTitle}>ماتریس دسترسی</h3>
                        <div className={tabStyles.inlineActions}>
                            <input placeholder="هدف (فایل/پوشه)" value={aclTarget} onChange={(e) => setAclTarget(e.target.value)} />
                            <input placeholder="نقش/کاربر" value={aclSubject} onChange={(e) => setAclSubject(e.target.value)} />
                            <select value={aclRole} onChange={(e) => setAclRole(e.target.value as AccessRule['role'])}>
                                {Object.entries(ACL_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <button type="button" className={tabStyles.smallBtn} onClick={() => void addAcl()}>افزودن</button>
                        </div>
                        {rules.map((r) => (
                            <div key={r.id} className={tabStyles.stepItem}>{r.targetName} → {r.subjectName}: {ACL_ROLE_LABELS[r.role]}</div>
                        ))}
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
