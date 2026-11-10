import { createApiClient, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';

export interface SupportTicket {
    _id: string;
    title: string;
    status: string;
    priority: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface SupportMessage {
    _id: string;
    content: string;
    senderRole: string;
    createdAt?: string;
    attachments?: string[];
}

export interface TicketListResponse {
    items: SupportTicket[];
    total: number;
    page: number;
    limit: number;
}

export interface TicketDetailsResponse {
    ticket: SupportTicket;
    messages: SupportMessage[];
}

export interface CreateTicketPayload {
    title: string;
    content: string;
    priority?: string;
}

const BASE = '/api/support';

export const SUPPORT_MAX_FILES = 10;
export const SUPPORT_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export interface UploadedFileResult {
    original?: { path?: string; mimetype?: string; originalname?: string; size?: number };
    thumbnail?: { path?: string } | null;
}

export const supportApi = {
    async listTickets(params?: { page?: number; limit?: number }): Promise<TicketListResponse> {
        const res = await createApiClient().get(`${BASE}/tickets`, {
            params: {
                page: params?.page ?? 1,
                limit: params?.limit ?? 20,
            },
        });
        return unwrapApiData(res);
    },

    async createTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
        const res = await createApiClient().post(`${BASE}/tickets`, payload);
        return unwrapApiData(res);
    },

    async getTicket(ticketId: string): Promise<TicketDetailsResponse> {
        const res = await createApiClient().get(`${BASE}/ticket/${ticketId}`);
        return unwrapApiData(res);
    },

    async replyToTicket(ticketId: string, content: string, attachments?: string[]): Promise<SupportMessage> {
        const res = await createApiClient().post(`${BASE}/ticket/${ticketId}/reply`, {
            content,
            ...(attachments?.length ? { attachments } : {}),
        });
        return unwrapApiData(res);
    },

    /**
     * آپلود فایل پیوست تیکت — خروجی URL عمومی فایل برای ذخیره در attachments پیام
     */
    async uploadAttachment(file: File): Promise<string> {
        if (file.size > SUPPORT_MAX_FILE_SIZE) {
            throw new Error(`FILE_TOO_LARGE:${file.name}`);
        }

        const form = new FormData();
        form.append('file', file, file.name);

        const res = await createApiClient().post('/api/file/multer/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = unwrapApiData<UploadedFileResult>(res);
        const url = data?.original?.path;
        if (!url) throw new Error('UPLOAD_FAILED');
        return url;
    },
};
