'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Container, Wrapper} from '@/app/(main)/layout';
import {useAppStore} from '@/app/zustand/store/useAppStore';
import styles from './agentChatSettings.module.scss';
import {
    AGENT_CHAT_API_ENDPOINTS,
    AGENT_CHAT_CAPABILITIES,
    AGENT_CHAT_OVERVIEW,
} from '../../lib/agentChatCapabilities';

function kindLabel(kind: 'read' | 'action' | 'system') {
    if (kind === 'read') return 'خواندنی';
    if (kind === 'action') return 'پیشنهادی';
    return 'سیستمی';
}

function kindClass(kind: 'read' | 'action' | 'system') {
    if (kind === 'read') return styles.readBadge;
    if (kind === 'action') return styles.actionBadge;
    return styles.confirmBadge;
}

export default function AgentChatSettingsPage() {
    const router = useRouter();
    const {appName} = useAppStore();

    useEffect(() => {
        if (appName && appName !== 'taskvision') {
            router.replace('/home');
        }
    }, [appName, router]);

    const readTools = AGENT_CHAT_CAPABILITIES.filter(item => item.kind === 'read');
    const actionTools = AGENT_CHAT_CAPABILITIES.filter(item => item.kind === 'action');

    return (
        <Container>
            <Wrapper>
                <div className={styles.container}>
                    <div>
                        <h1 className={styles.mainTitle}>تنظیمات Agent Chat</h1>
                        <p className={styles.subtitle}>
                            مرجع قابلیت‌های دستیار هوشمند TaskVision برای بررسی تیم. این صفحه فقط در اپلیکیشن TaskVision در Naslyar نمایش داده می‌شود.
                        </p>
                    </div>

                    <section>
                        <h2 className={styles.sectionTitle}>خلاصه سیستم</h2>
                        <div className={styles.overviewGrid}>
                            <div className={styles.overviewCard}>
                                <span className={styles.overviewLabel}>عنوان</span>
                                <span className={styles.overviewValue}>{AGENT_CHAT_OVERVIEW.title}</span>
                            </div>
                            <div className={styles.overviewCard}>
                                <span className={styles.overviewLabel}>ارائه‌دهنده LLM</span>
                                <span className={styles.overviewValue}>{AGENT_CHAT_OVERVIEW.provider}</span>
                            </div>
                            <div className={styles.overviewCard}>
                                <span className={styles.overviewLabel}>مدل تأیید</span>
                                <span className={styles.overviewValue}>{AGENT_CHAT_OVERVIEW.confirmationModel}</span>
                            </div>
                            <div className={styles.overviewCard}>
                                <span className={styles.overviewLabel}>مدل گفتگو</span>
                                <span className={styles.overviewValue}>{AGENT_CHAT_OVERVIEW.sessionModel}</span>
                            </div>
                            <div className={styles.overviewCard}>
                                <span className={styles.overviewLabel}>محدودیت تاریخچه</span>
                                <span className={styles.overviewValue}>{AGENT_CHAT_OVERVIEW.historyLimit}</span>
                            </div>
                            <div className={styles.overviewCard}>
                                <span className={styles.overviewLabel}>محدودیت حلقه ابزار</span>
                                <span className={styles.overviewValue}>{AGENT_CHAT_OVERVIEW.toolLoopLimit}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className={styles.sectionTitle}>ابزارهای خواندنی ({readTools.length})</h2>
                        <div className={styles.capabilityList}>
                            {readTools.map(item => (
                                <article key={item.id} className={styles.capabilityCard}>
                                    <div className={styles.capabilityHeader}>
                                        <div className={styles.capabilityTitleWrap}>
                                            <h3 className={styles.capabilityName}>{item.name}</h3>
                                            <code className={styles.capabilityId}>{item.id}</code>
                                        </div>
                                        <span className={kindClass(item.kind)}>{kindLabel(item.kind)}</span>
                                    </div>
                                    <p className={styles.capabilitySummary}>{item.summary}</p>
                                    <p className={styles.capabilityDescription}>{item.description}</p>
                                    {item.parameters?.length ? (
                                        <div className={styles.parameters}>
                                            {item.parameters.map(param => (
                                                <span key={param} className={styles.parameterChip}>{param}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className={styles.sectionTitle}>ابزارهای پیشنهادی ({actionTools.length})</h2>
                        <div className={styles.capabilityList}>
                            {actionTools.map(item => (
                                <article key={item.id} className={styles.capabilityCard}>
                                    <div className={styles.capabilityHeader}>
                                        <div className={styles.capabilityTitleWrap}>
                                            <h3 className={styles.capabilityName}>{item.name}</h3>
                                            <code className={styles.capabilityId}>{item.id}</code>
                                        </div>
                                        <div style={{display: 'flex', gap: 6}}>
                                            <span className={kindClass(item.kind)}>{kindLabel(item.kind)}</span>
                                            {item.requiresConfirmation && (
                                                <span className={styles.confirmBadge}>نیاز به تأیید</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className={styles.capabilitySummary}>{item.summary}</p>
                                    <p className={styles.capabilityDescription}>{item.description}</p>
                                    {item.parameters?.length ? (
                                        <div className={styles.parameters}>
                                            {item.parameters.map(param => (
                                                <span key={param} className={styles.parameterChip}>{param}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className={styles.sectionTitle}>API Endpoints</h2>
                        <table className={styles.endpointTable}>
                            <thead>
                            <tr>
                                <th>Method</th>
                                <th>Path</th>
                                <th>توضیح</th>
                            </tr>
                            </thead>
                            <tbody>
                            {AGENT_CHAT_API_ENDPOINTS.map(endpoint => (
                                <tr key={`${endpoint.method}-${endpoint.path}`}>
                                    <td className={styles.method}>{endpoint.method}</td>
                                    <td className={styles.path}>{endpoint.path}</td>
                                    <td>{endpoint.description}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </section>
                </div>
            </Wrapper>
        </Container>
    );
}
