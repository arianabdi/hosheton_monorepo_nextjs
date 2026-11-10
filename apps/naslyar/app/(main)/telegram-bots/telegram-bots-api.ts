import axios from 'axios';
import type { TelegramBot, TelegramBotListResult } from './telegram-bots.types';

function headers(token: string) {
    return { authorization: `Bearer ${token}` };
}

function unwrap<T>(res: { data: { statusCode?: number; data?: T } }): T {
    if (res.data && typeof res.data === 'object' && 'data' in res.data) {
        return res.data.data as T;
    }
    return res.data as T;
}

export async function listBots(baseUrl: string, token: string, page = 1, limit = 100) {
    const res = await axios.get(`${baseUrl}/api/telegram-bot-builder`, {
        params: { page, limit },
        headers: headers(token),
    });
    return unwrap<TelegramBotListResult>(res);
}

export async function getBot(baseUrl: string, token: string, id: string) {
    const res = await axios.get(`${baseUrl}/api/telegram-bot-builder`, {
        params: { page: 1, limit: 1000 },
        headers: headers(token),
    });
    const list = unwrap<TelegramBotListResult>(res);
    const bot = list.items.find((b) => b._id === id);
    if (!bot) throw new Error('بات یافت نشد');
    return bot;
}

export async function validateToken(baseUrl: string, token: string, botToken: string) {
    const res = await axios.post(
        `${baseUrl}/api/telegram-bot-builder/validate-token`,
        { botToken },
        { headers: headers(token) },
    );
    return unwrap<{ id: number; username: string; first_name: string }>(res);
}

export async function createBot(baseUrl: string, token: string, body: { name: string; botToken: string; description?: string }) {
    const res = await axios.post(`${baseUrl}/api/telegram-bot-builder`, body, { headers: headers(token) });
    return unwrap<TelegramBot>(res);
}

export async function updateBot(baseUrl: string, token: string, id: string, body: Partial<TelegramBot>) {
    const res = await axios.put(`${baseUrl}/api/telegram-bot-builder/${id}`, body, { headers: headers(token) });
    return unwrap<TelegramBot>(res);
}

export async function deleteBot(baseUrl: string, token: string, id: string) {
    await axios.delete(`${baseUrl}/api/telegram-bot-builder/${id}`, { headers: headers(token) });
}

export async function setWebhook(baseUrl: string, token: string, id: string, publicBaseUrl?: string) {
    const res = await axios.post(
        `${baseUrl}/api/telegram-bot-builder/${id}/set-webhook`,
        publicBaseUrl ? { publicBaseUrl } : {},
        { headers: headers(token) },
    );
    return unwrap<{ url: string }>(res);
}

export async function deleteWebhook(baseUrl: string, token: string, id: string) {
    await axios.delete(`${baseUrl}/api/telegram-bot-builder/${id}/set-webhook`, { headers: headers(token) });
}
