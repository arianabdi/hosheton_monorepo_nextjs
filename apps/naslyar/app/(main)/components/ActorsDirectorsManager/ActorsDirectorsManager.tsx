'use client';

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './ActorsDirectorsManager.module.scss';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';

interface Person {
    _id: string;
    name: string;
    characterName?: string;
    birthYear?: string;
    bio?: string;
    avatarUrl?: string;
}

interface Props {
    filmId: string;
    type: 'actors' | 'directors';
    existing: Person[];
    onUpdate: () => void;
}

const ActorsDirectorsManager: React.FC<Props> = ({ filmId, type, existing, onUpdate }) => {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [newName, setNewName] = useState('');
    const [characterName, setCharacterName] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<Person[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const isActors = type === 'actors';
    const title = isActors ? 'بازیگران' : 'کارگردانان';
    const singular = isActors ? 'بازیگر' : 'کارگردان';
    const endpoint = isActors ? 'actors' : 'directors';
    const searchEndpoint = isActors ? '/api/cast/actors' : '/api/cast/directors';

    const headers = useMemo(
        () => ({ authorization: `Bearer ${token}` }),
        [token],
    );

    useEffect(() => {
        if (!newName.trim() || newName.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(
                    `${baseUrl}${searchEndpoint}?search=${encodeURIComponent(newName.trim())}&limit=8&page=1`,
                    { headers },
                );
                const list = res.data?.data?.[isActors ? 'actors' : 'directors'] || [];
                setSearchResults(list);
                setShowSuggestions(true);
            } catch (_) {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [newName, baseUrl, searchEndpoint, headers, isActors]);

    const addPerson = async (payload?: Partial<Person>) => {
        const name = (payload?.name || newName).trim();
        if (!name) {
            toast.warning(`لطفا نام ${singular} را وارد کنید`);
            return;
        }

        setLoading(true);
        try {
            const body = isActors
                ? {
                    name,
                    characterName: payload?.characterName || characterName || undefined,
                    birthYear: payload?.birthYear,
                    bio: payload?.bio,
                    avatarUrl: payload?.avatarUrl,
                }
                : {
                    name,
                    birthYear: payload?.birthYear,
                    bio: payload?.bio,
                    avatarUrl: payload?.avatarUrl,
                };

            const res = await axios.post(`${baseUrl}/api/films/${filmId}/${endpoint}`, body, { headers });

            if (res.data.statusCode === 200) {
                toast.success(`${singular} با موفقیت اضافه شد`);
                setNewName('');
                setCharacterName('');
                setShowSuggestions(false);
                onUpdate();
            }
        } catch (err: any) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    };

    const syncWithAi = async () => {
        setAiLoading(true);
        try {
            const aiEndpoint = isActors ? 'actors' : 'directors';
            const res = await axios.post(`${baseUrl}/api/films/${filmId}/${aiEndpoint}/ai-sync`, {}, { headers });

            if (res.data.statusCode === 200) {
                const summary = res.data.data?.summary;
                toast.success(
                    `هوش مصنوعی: ${summary?.created?.length || 0} جدید، ${summary?.matched?.length || 0} موجود، ${summary?.linked?.length || 0} به فیلم اضافه شد`,
                );
                onUpdate();
            }
        } catch (err: any) {
            ErrorToaster(err);
            toast.error(`خطا در دریافت لیست ${title} از هوش مصنوعی`);
        } finally {
            setAiLoading(false);
        }
    };

    const removePerson = async (personId: string, personName: string) => {
        if (!confirm(`آیا از حذف ${personName} از این فیلم مطمئن هستید؟`)) return;

        setLoading(true);
        try {
            const res = await axios.delete(`${baseUrl}/api/films/${filmId}/${endpoint}/${personId}`, { headers });

            if (res.data.statusCode === 200) {
                toast.success('با موفقیت حذف شد');
                onUpdate();
            }
        } catch (err: any) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    };

    const selectSuggestion = (person: Person) => {
        setNewName(person.name);
        if (isActors && person.characterName) {
            setCharacterName(person.characterName);
        }
        setShowSuggestions(false);
    };

    return (
        <div className={styles.manager}>
            <div className={styles.headerRow}>
                <h3 className={styles.title}>{title}</h3>
                <button
                    type="button"
                    onClick={syncWithAi}
                    disabled={aiLoading || loading}
                    className={styles.aiBtn}
                >
                    {aiLoading ? 'در حال دریافت...' : '✨ پر کردن با هوش مصنوعی'}
                </button>
            </div>

            <div className={styles.list}>
                {existing.length === 0 ? (
                    <p className={styles.empty}>هنوز {title} اضافه نشده است.</p>
                ) : (
                    existing.map((person) => (
                        <div key={person._id} className={styles.item}>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemName}>{person.name}</span>
                                {isActors && person.characterName && (
                                    <span className={styles.itemRole}>نقش: {person.characterName}</span>
                                )}
                                {person.birthYear && (
                                    <span className={styles.itemMeta}>متولد {person.birthYear}</span>
                                )}
                                {person.bio && (
                                    <span className={styles.itemBio}>{person.bio}</span>
                                )}
                            </div>
                            <button
                                onClick={() => removePerson(person._id, person.name)}
                                disabled={loading || aiLoading}
                                className={styles.removeBtn}
                            >
                                حذف
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className={styles.addForm}>
                <div className={styles.inputGroup}>
                    <input
                        type="text"
                        placeholder={`نام ${singular}`}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                        className={styles.input}
                        disabled={loading || aiLoading}
                    />
                    {showSuggestions && searchResults.length > 0 && (
                        <div className={styles.suggestions}>
                            {searchResults.map((person) => (
                                <button
                                    key={person._id}
                                    type="button"
                                    className={styles.suggestionItem}
                                    onClick={() => selectSuggestion(person)}
                                >
                                    <span>{person.name}</span>
                                    {person.birthYear && <small>{person.birthYear}</small>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {isActors && (
                    <input
                        type="text"
                        placeholder="نام نقش (اختیاری)"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        className={styles.input}
                        disabled={loading || aiLoading}
                    />
                )}

                <button
                    onClick={() => addPerson()}
                    disabled={loading || aiLoading || !newName.trim()}
                    className={styles.addBtn}
                >
                    {loading ? 'در حال افزودن...' : `افزودن ${singular}`}
                </button>
            </div>
        </div>
    );
};

export default ActorsDirectorsManager;
