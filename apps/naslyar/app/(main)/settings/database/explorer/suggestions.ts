import { objectIdFromDate } from './ejson';

export interface SchemaField {
    path: string;
    presence: number;
    types: string[];
}

export interface FindTemplate {
    label: string;
    hint: string;
    filter: string;
    sort?: string;
    projection?: string;
}

export interface PipelineTemplate {
    label: string;
    hint: string;
    pipeline: string;
}

const isTop = (f: SchemaField) => !f.path.includes('.');
const key = (p: string) => (/^[A-Za-z_$][\w$]*$/.test(p) ? p : JSON.stringify(p));
const daysAgo = (n: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
};

function pick(fields: SchemaField[], type: string, prefer: RegExp) {
    const list = fields.filter((f) => f.types[0] === type && f.path !== '_id');
    return list.find((f) => prefer.test(f.path)) || list[0];
}

/** Ready-made filters for the selected collection, built from its sampled fields. */
export function findTemplates(fields: SchemaField[]): FindTemplate[] {
    const top = fields.filter(isTop);
    const out: FindTemplate[] = [
        { label: 'آخرین سندها', hint: 'جدیدترین‌ها اول (بر اساس زمان ساخت _id)', filter: '{}', sort: '{ _id: -1 }' },
        { label: 'با _id', hint: 'یک سند مشخص', filter: '{ _id: ObjectId("") }' },
        {
            label: 'ساخته‌شده امروز',
            hint: 'از روی زمان داخل ObjectId — بدون نیاز به فیلد تاریخ',
            filter: `{ _id: { $gte: ObjectId("${objectIdFromDate(daysAgo(0))}") } }`,
            sort: '{ _id: -1 }',
        },
    ];

    const date = pick(top, 'date', /^(createdAt|updatedAt|date|at)$/i);
    if (date) {
        out.push({
            label: `۷ روز اخیر (${date.path})`,
            hint: 'بازهٔ زمانی؛ ISODate را عوض کنید',
            filter: `{ ${key(date.path)}: { $gte: ISODate("${daysAgo(7).toISOString()}"), $lt: ISODate("${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}") } }`,
            sort: `{ ${key(date.path)}: -1 }`,
        });
    }

    const ref = pick(top, 'objectId', /(project|user|owner|workspace|creator)Id$/i);
    if (ref) out.push({ label: `بر اساس ${ref.path}`, hint: 'سندهای مربوط به یک شناسه', filter: `{ ${key(ref.path)}: ObjectId("") }` });

    const text = pick(top, 'string', /^(title|name|email|mobile|phone|slug|username)$/i);
    if (text) out.push({ label: `جستجو در ${text.path}`, hint: 'regex؛ i = بدون حساسیت به حروف', filter: `{ ${key(text.path)}: /متن/i }` });

    const bool = pick(top, 'bool', /^(isAlive|isActive|active|enabled|deleted|isDeleted)$/i);
    if (bool) out.push({ label: `${bool.path} = false`, hint: 'مثلاً سندهای حذف‌نرم یا غیرفعال', filter: `{ ${key(bool.path)}: false }` });

    const optional = top.find((f) => f.presence < 0.95 && f.presence > 0 && f.path !== '_id');
    if (optional) out.push({ label: `بدون ${optional.path}`, hint: 'سندهایی که این فیلد را ندارند', filter: `{ ${key(optional.path)}: { $exists: false } }` });

    const mixed = top.find((f) => f.types.length > 1 && f.path !== '_id');
    if (mixed) {
        const t = mixed.types[1] === 'objectId' ? 'string' : mixed.types[1];
        out.push({
            label: `${mixed.path} با نوع ${t}`,
            hint: `این فیلد چند نوع دارد (${mixed.types.join('، ')}) — سندهای ناهمخوان را پیدا کنید`,
            filter: `{ ${key(mixed.path)}: { $type: "${t}" } }`,
        });
    }
    return out;
}

/** Ready-made pipelines (group, top values, daily histogram, duplicates). */
export function pipelineTemplates(fields: SchemaField[]): PipelineTemplate[] {
    const top = fields.filter(isTop);
    const group = pick(top, 'string', /^(status|type|kind|role|state|category|platform)$/i) || pick(top, 'objectId', /Id$/);
    const date = pick(top, 'date', /^(createdAt|updatedAt|date)$/i);
    const uniq = pick(top, 'string', /^(email|mobile|phone|slug|username|code)$/i);
    const out: PipelineTemplate[] = [];
    if (group) {
        out.push({
            label: `شمارش بر اساس ${group.path}`,
            hint: 'هر مقدار چند سند دارد',
            pipeline: `[\n  { $group: { _id: "$${group.path}", count: { $sum: 1 } } },\n  { $sort: { count: -1 } }\n]`,
        });
    }
    if (date) {
        out.push({
            label: `روزانه (${date.path})`,
            hint: 'تعداد سند در هر روز — ۳۰ روز اخیر',
            pipeline: `[\n  { $match: { ${key(date.path)}: { $gte: ISODate("${daysAgo(30).toISOString()}") } } },\n  { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$${date.path}", timezone: "Asia/Tehran" } }, count: { $sum: 1 } } },\n  { $sort: { _id: 1 } }\n]`,
        });
    }
    if (uniq) {
        out.push({
            label: `تکراری‌ها در ${uniq.path}`,
            hint: 'مقدارهایی که بیش از یک سند دارند',
            pipeline: `[\n  { $group: { _id: "$${uniq.path}", count: { $sum: 1 }, ids: { $push: "$_id" } } },\n  { $match: { count: { $gt: 1 } } },\n  { $sort: { count: -1 } }\n]`,
        });
    }
    out.push({
        label: 'بزرگ‌ترین سندها',
        hint: 'حجم هر سند به بایت',
        pipeline: `[\n  { $project: { size: { $bsonSize: "$$ROOT" } } },\n  { $sort: { size: -1 } },\n  { $limit: 20 }\n]`,
    });
    out.push({
        label: 'نوع فیلدها',
        hint: 'هر فیلد در چند سند با چه نوعی آمده',
        pipeline: `[\n  { $project: { kv: { $objectToArray: "$$ROOT" } } },\n  { $unwind: "$kv" },\n  { $group: { _id: { field: "$kv.k", type: { $type: "$kv.v" } }, count: { $sum: 1 } } },\n  { $sort: { "_id.field": 1 } }\n]`,
    });
    return out;
}
