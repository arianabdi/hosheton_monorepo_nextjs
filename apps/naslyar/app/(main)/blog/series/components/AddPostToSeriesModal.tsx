'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Field, LoadingState } from '@my-workspace/components';
import { ErrorToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';

import { IoAddOutline } from 'react-icons/io5';
import {IoMdClose} from "react-icons/io";


interface PostItem {
    _id: string;
    title: string;
    categoryName?: string;
}

interface AddPostToSeriesModalProps {
    items: Array<{ _id: string; title: string; order?: string }>;
    onClose: () => void;
    onAdd: (item: { _id: string; title: string }) => void;
}

export default function AddPostToSeriesModal({ items, onClose, onAdd }: AddPostToSeriesModalProps) {
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PostItem[]>([]);

    const loadData = async (title = search) => {
        if (!token) return;
        try {
            setIsLoading(true);
            const res = await axios.get(
                `${baseUrl}/api/blog/panel?limit=20&page=1&showHidden=true${title ? `&title=${encodeURIComponent(title)}` : ''}`,
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                setResult(res.data.data.posts || []);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData('');
    }, [token, baseUrl]);

    const exists = (id: string) => items.some((item) => item._id === id);

    return (
        <div style={{ padding: '1rem', minWidth: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>افزودن مقاله</h4>
                <button type="button" onClick={onClose} aria-label="بستن"><IoMdClose size={20} /></button>
            </div>
            <Field
                value={search}
                type="text"
                className="form-control form-control-sm"
                onChange={setSearch}
            />
            <button type="button" className="btn btn-sm btn-primary mt-2 mb-3" onClick={() => loadData(search)}>
                جستجو
            </button>
            {isLoading ? (
                <LoadingState />
            ) : (
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {result.map((item) => (
                        <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                                <strong>{item.title}</strong>
                                {item.categoryName && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{item.categoryName}</div>}
                            </div>
                            {exists(item._id) ? (
                                <span style={{ color: 'var(--brand-color)' }}>✓</span>
                            ) : (
                                <button type="button" onClick={() => onAdd({ _id: item._id, title: item.title })}>
                                    <IoAddOutline size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
