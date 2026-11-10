import { createId, loadSetting, saveSetting } from '@/app/utils/system-setting-api';
import {
    createDocumentId,
    loadFolderTree,
    saveFolderTree,
} from '../documents/documents-api';
import { ROOT_FOLDER_ID } from '../documents/documents.types';
import type {
    Meeting,
    MeetingActionItem,
    MeetingActionSmsRule,
    MeetingAttachment,
    MeetingMinute,
    MeetingMinuteTemplate,
    MeetingSmsReminder,
    MeetingsStore,
} from './meetings.types';
import { DEFAULT_ACTION_SMS_RULE, buildMeetingDmsFolderPath } from './meetings.types';

const KEYS = {
    meetings: 'meetings.schedules',
    smsReminders: 'meetings.smsReminders',
    actionSmsRule: 'meetings.actionSmsRule',
    minuteTemplates: 'meetings.minuteTemplates',
    minutes: 'meetings.minutes',
    attachments: 'meetings.attachments',
    actionItems: 'meetings.actionItems',
} as const;

const META = {
    group: 'meetings',
    label: 'مدیریت جلسات',
    description: 'زمان‌بندی، صورتجلسه، پیامک و یکپارچگی DMS.',
};

function normalizeArray<T>(payload: unknown): T[] {
    return Array.isArray(payload) ? (payload as T[]) : [];
}

function normalizeActionSmsRule(payload: unknown): MeetingActionSmsRule {
    if (payload && typeof payload === 'object') {
        return { ...DEFAULT_ACTION_SMS_RULE, ...(payload as MeetingActionSmsRule) };
    }
    return { ...DEFAULT_ACTION_SMS_RULE };
}

export async function loadMeetings(baseUrl: string, token: string) {
    return loadSetting<Meeting[]>(baseUrl, token, KEYS.meetings, META, [], normalizeArray);
}

export async function saveMeetings(baseUrl: string, token: string, meetings: Meeting[]) {
    await saveSetting(baseUrl, token, KEYS.meetings, meetings);
}

export async function loadSmsReminders(baseUrl: string, token: string) {
    return loadSetting<MeetingSmsReminder[]>(baseUrl, token, KEYS.smsReminders, META, [], normalizeArray);
}

export async function saveSmsReminders(baseUrl: string, token: string, reminders: MeetingSmsReminder[]) {
    await saveSetting(baseUrl, token, KEYS.smsReminders, reminders);
}

export async function loadActionSmsRule(baseUrl: string, token: string) {
    return loadSetting<MeetingActionSmsRule>(
        baseUrl,
        token,
        KEYS.actionSmsRule,
        META,
        DEFAULT_ACTION_SMS_RULE,
        normalizeActionSmsRule,
    );
}

export async function saveActionSmsRule(baseUrl: string, token: string, rule: MeetingActionSmsRule) {
    await saveSetting(baseUrl, token, KEYS.actionSmsRule, rule);
}

export async function loadMinuteTemplates(baseUrl: string, token: string) {
    return loadSetting<MeetingMinuteTemplate[]>(baseUrl, token, KEYS.minuteTemplates, META, [], normalizeArray);
}

export async function saveMinuteTemplates(baseUrl: string, token: string, templates: MeetingMinuteTemplate[]) {
    await saveSetting(baseUrl, token, KEYS.minuteTemplates, templates);
}

export async function loadMinutes(baseUrl: string, token: string) {
    return loadSetting<MeetingMinute[]>(baseUrl, token, KEYS.minutes, META, [], normalizeArray);
}

export async function saveMinutes(baseUrl: string, token: string, minutes: MeetingMinute[]) {
    await saveSetting(baseUrl, token, KEYS.minutes, minutes);
}

export async function loadAttachments(baseUrl: string, token: string) {
    return loadSetting<MeetingAttachment[]>(baseUrl, token, KEYS.attachments, META, [], normalizeArray);
}

export async function saveAttachments(baseUrl: string, token: string, attachments: MeetingAttachment[]) {
    await saveSetting(baseUrl, token, KEYS.attachments, attachments);
}

export async function loadActionItems(baseUrl: string, token: string) {
    return loadSetting<MeetingActionItem[]>(baseUrl, token, KEYS.actionItems, META, [], normalizeArray);
}

export async function saveActionItems(baseUrl: string, token: string, items: MeetingActionItem[]) {
    await saveSetting(baseUrl, token, KEYS.actionItems, items);
}

export async function loadMeetingsStore(baseUrl: string, token: string): Promise<MeetingsStore> {
    const [meetings, smsReminders, actionSmsRule, minuteTemplates, minutes, attachments, actionItems] =
        await Promise.all([
            loadMeetings(baseUrl, token),
            loadSmsReminders(baseUrl, token),
            loadActionSmsRule(baseUrl, token),
            loadMinuteTemplates(baseUrl, token),
            loadMinutes(baseUrl, token),
            loadAttachments(baseUrl, token),
            loadActionItems(baseUrl, token),
        ]);
    return {
        meetings: meetings.value,
        smsReminders: smsReminders.value,
        actionSmsRule: actionSmsRule.value,
        minuteTemplates: minuteTemplates.value,
        minutes: minutes.value,
        attachments: attachments.value,
        actionItems: actionItems.value,
    };
}

/** MVP: ساخت پوشه مجازی جلسه در درخت DMS (system-setting) */
export async function ensureMeetingDmsFolder(
    baseUrl: string,
    token: string,
    meeting: Meeting,
): Promise<{ folderId: string; folderPath: string }> {
    const folderPath = buildMeetingDmsFolderPath(meeting);
    const { value: tree } = await loadFolderTree(baseUrl, token);

    const existing = tree.find((f) => f.name === folderPath);
    if (existing) {
        return { folderId: existing.id, folderPath };
    }

    const meetingsRoot =
        tree.find((f) => f.name === 'Meetings' && f.parentId === ROOT_FOLDER_ID) ??
        (() => {
            const root = {
                id: createDocumentId('fld'),
                name: 'Meetings',
                parentId: ROOT_FOLDER_ID,
                fileIds: [],
                createdAt: new Date().toISOString(),
            };
            tree.push(root);
            return root;
        })();

    const folder = {
        id: createDocumentId('fld'),
        name: folderPath,
        parentId: meetingsRoot.id,
        fileIds: [],
        createdAt: new Date().toISOString(),
    };
    await saveFolderTree(baseUrl, token, [...tree, folder]);
    return { folderId: folder.id, folderPath };
}

export { createId as createMeetingId };
