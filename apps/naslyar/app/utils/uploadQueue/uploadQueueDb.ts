import type { AddUploadJobInput, StoredUploadFile, UploadJob } from './types';

const DB_NAME = 'naslyar-upload-queue';
const DB_VERSION = 1;

const openDb = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains('jobs')) {
                const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' });
                jobsStore.createIndex('status', 'status', { unique: false });
                jobsStore.createIndex('filmId', 'filmId', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const withStore = <T>(
    storeName: 'files' | 'jobs',
    mode: IDBTransactionMode,
    handler: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> =>
    openDb().then(
        (db) =>
            new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);
                const request = handler(store);

                if (!request) {
                    transaction.oncomplete = () => {
                        db.close();
                        resolve(undefined);
                    };
                    transaction.onerror = () => {
                        db.close();
                        reject(transaction.error);
                    };
                    return;
                }

                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
                transaction.oncomplete = () => db.close();
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error);
                };
            })
    );

const withStores = <T>(
    storeNames: Array<'files' | 'jobs'>,
    mode: IDBTransactionMode,
    handler: (stores: Record<'files' | 'jobs', IDBObjectStore>) => void
): Promise<void> =>
    openDb().then(
        (db) =>
            new Promise((resolve, reject) => {
                const transaction = db.transaction(storeNames, mode);
                const stores = {
                    files: transaction.objectStore('files'),
                    jobs: transaction.objectStore('jobs'),
                };

                try {
                    handler(stores);
                } catch (error) {
                    db.close();
                    reject(error);
                    return;
                }

                transaction.oncomplete = () => {
                    db.close();
                    resolve();
                };
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error);
                };
            })
    );

const createId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const getAllUploadJobs = async (): Promise<UploadJob[]> => {
    const jobs = (await withStore<UploadJob[]>('jobs', 'readonly', (store) => store.getAll())) || [];
    return jobs.sort((a, b) => a.createdAt - b.createdAt);
};

export const getUploadJob = async (jobId: string): Promise<UploadJob | undefined> => {
    return (await withStore<UploadJob | undefined>('jobs', 'readonly', (store) => store.get(jobId))) || undefined;
};

export const saveUploadJob = async (job: UploadJob): Promise<void> => {
    await withStore('jobs', 'readwrite', (store) => store.put(job));
};

export const deleteUploadJob = async (jobId: string): Promise<void> => {
    await withStore('jobs', 'readwrite', (store) => store.delete(jobId));
};

export const getStoredFile = async (fileId: string): Promise<StoredUploadFile | undefined> => {
    return (await withStore<StoredUploadFile | undefined>('files', 'readonly', (store) => store.get(fileId))) || undefined;
};

export const saveStoredFile = async (file: StoredUploadFile): Promise<void> => {
    await withStore('files', 'readwrite', (store) => store.put(file));
};

export const deleteStoredFile = async (fileId: string): Promise<void> => {
    await withStore('files', 'readwrite', (store) => store.delete(fileId));
};

export const addUploadJob = async (input: AddUploadJobInput): Promise<UploadJob> => {
    const now = Date.now();
    const fileId = createId();
    const jobId = createId();

    const storedFile: StoredUploadFile = {
        id: fileId,
        blob: input.file,
        name: input.file.name,
        size: input.file.size,
        type: input.file.type,
        lastModified: input.file.lastModified,
    };

    const job: UploadJob = {
        id: jobId,
        fileId,
        fileName: input.file.name,
        fileSize: input.file.size,
        filmId: input.filmId,
        filmName: input.filmName,
        seasonId: input.seasonId ?? null,
        episodeId: input.episodeId ?? null,
        episodeTitle: input.episodeTitle,
        resolution: input.resolution,
        contentType: input.contentType ?? 'MOVIE',
        status: 'pending',
        progress: 0,
        storageKey: `upload_cache_${jobId}`,
        createdAt: now,
        updatedAt: now,
    };

    await withStores(['files', 'jobs'], 'readwrite', ({ files, jobs }) => {
        files.put(storedFile);
        jobs.put(job);
    });

    return job;
};

export const removeUploadJobWithFile = async (jobId: string): Promise<void> => {
    const job = await getUploadJob(jobId);
    if (!job) return;

    await withStores(['files', 'jobs'], 'readwrite', ({ files, jobs }) => {
        jobs.delete(jobId);
        files.delete(job.fileId);
    });

    localStorage.removeItem(job.storageKey);
};

export const resetInterruptedUploadJobs = async (): Promise<UploadJob[]> => {
    const jobs = await getAllUploadJobs();
    const updatedJobs: UploadJob[] = [];

    for (const job of jobs) {
        if (job.status === 'uploading') {
            const updatedJob: UploadJob = {
                ...job,
                status: 'pending',
                updatedAt: Date.now(),
            };
            await saveUploadJob(updatedJob);
            updatedJobs.push(updatedJob);
        } else {
            updatedJobs.push(job);
        }
    }

    return updatedJobs.sort((a, b) => a.createdAt - b.createdAt);
};
