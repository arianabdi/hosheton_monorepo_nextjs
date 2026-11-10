export type MeetingRecurrence = 'once' | 'weekly' | 'monthly';

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export interface MeetingInvitee {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    group?: string;
}

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    startsAt: string;
    durationMinutes: number;
    recurrence: MeetingRecurrence;
    recurrenceRule?: string;
    invitees: MeetingInvitee[];
    status: MeetingStatus;
    dmsFolderId?: string;
    dmsFolderPath?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MeetingSmsReminder {
    id: string;
    meetingId: string;
    meetingTitle: string;
    hoursBefore: number;
    patternId?: string;
    isActive: boolean;
}

export interface MeetingActionSmsRule {
    id: string;
    enabled: boolean;
    sendOnApproval: boolean;
    includeDeadline: boolean;
}

export interface MeetingMinuteFormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'user';
    required: boolean;
}

export interface MeetingMinuteTemplate {
    id: string;
    name: string;
    fields: MeetingMinuteFormField[];
    createdAt: string;
}

export type MinuteStatus = 'draft' | 'approved' | 'sent_to_dms';

export interface MeetingMinute {
    id: string;
    meetingId: string;
    meetingTitle: string;
    body: string;
    formValues: Record<string, string>;
    status: MinuteStatus;
    dmsDocumentId?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MeetingAttachment {
    id: string;
    meetingId: string;
    dmsDocumentId: string;
    dmsFolderId?: string;
    fileName: string;
    linkedAt: string;
}

export type ActionItemStatus = 'in_progress' | 'done' | 'overdue';

export interface MeetingActionItem {
    id: string;
    meetingId: string;
    meetingTitle: string;
    title: string;
    assignee: string;
    dueDate?: string;
    status: ActionItemStatus;
    minuteId?: string;
    smsSent: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MeetingsStore {
    meetings: Meeting[];
    smsReminders: MeetingSmsReminder[];
    actionSmsRule: MeetingActionSmsRule;
    minuteTemplates: MeetingMinuteTemplate[];
    minutes: MeetingMinute[];
    attachments: MeetingAttachment[];
    actionItems: MeetingActionItem[];
}

export const DEFAULT_ACTION_SMS_RULE: MeetingActionSmsRule = {
    id: 'default',
    enabled: true,
    sendOnApproval: true,
    includeDeadline: true,
};

export const DEFAULT_MEETINGS_STORE: MeetingsStore = {
    meetings: [],
    smsReminders: [],
    actionSmsRule: DEFAULT_ACTION_SMS_RULE,
    minuteTemplates: [],
    minutes: [],
    attachments: [],
    actionItems: [],
};

export const RECURRENCE_LABELS: Record<MeetingRecurrence, string> = {
    once: 'یک‌بار',
    weekly: 'هفتگی',
    monthly: 'ماهانه',
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
    scheduled: 'برنامه‌ریزی‌شده',
    completed: 'برگزار شده',
    cancelled: 'لغوشده',
};

export const MINUTE_STATUS_LABELS: Record<MinuteStatus, string> = {
    draft: 'پیش‌نویس',
    approved: 'تأیید شده',
    sent_to_dms: 'ارسال به DMS',
};

export const ACTION_STATUS_LABELS: Record<ActionItemStatus, string> = {
    in_progress: 'در حال انجام',
    done: 'انجام‌شده',
    overdue: 'معوق',
};

export function buildMeetingDmsFolderPath(meeting: Pick<Meeting, 'id' | 'title' | 'startsAt'>): string {
    const year = new Date(meeting.startsAt).getFullYear();
    const slug = meeting.title.trim().slice(0, 40) || meeting.id;
    return `DMS/Meetings/${year}/${slug}`;
}
