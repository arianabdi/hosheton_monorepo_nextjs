'use client';

import React, {useEffect, useMemo, useState} from 'react';
import axios from 'axios';
import {useParams, useRouter} from 'next/navigation';
import {ErrorToaster, SuccessToaster} from "@my-workspace/utils";
import {useAppStore} from "@/app/zustand/store/useAppStore";
import {useAuthStore} from "@/app/zustand/store/authStore";
import JsonEditor from "@/app/components/jsonEditor/JsonEditor";


// --- MAIN COMPONENT ---
const TranslationEdit: React.FC = () => {
    const {baseUrl} = useAppStore();
    const {token} = useAuthStore();
    const router = useRouter();
    const {id} = useParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState();

    const systemFields = useMemo(() =>
            ['_id', 'id', 'wordId', 'createdAt', 'updatedAt', '__v', 'isAlive', '$oid', '$date'],
        []);

    const fetchTranslationDetails = React.useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/translation/${id}`, {
                headers: {"authorization": `Bearer ${token}`},
            });
            if (res.data?.data) {
                setData(res.data?.data)
                setLoading(false);
            }
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    }, [baseUrl, token, id, systemFields]);

    useEffect(() => {
        fetchTranslationDetails();
    }, [fetchTranslationDetails]);


    const handleSubmit = async (newData) => {
        try {
            setSubmitting(true);
            const res = await axios.put(`${baseUrl}/api/translation/${id}`, newData, {
                headers: {"authorization": `Bearer ${token}`},
            });
            if (res.data.statusCode === 200) {
                SuccessToaster({message: "تغییرات با موفقیت ذخیره شد"});
                setSubmitting(false);
                router.refresh();
            }
        } catch (err: any) {
            ErrorToaster(err);
            setSubmitting(false);
        }
    };


    return (
        <JsonEditor
            data={data}
            title={'ویرایشگر پیشرفته اطلاعات ترجمه'}
            description={'بهینه‌سازی شده برای مجموعه داده‌های بزرگ و پیچیدهبهینه‌سازی شده برای مجموعه داده‌های بزرگ و پیچیده'}
            loading={loading}
            handleSubmit={async (newData) => {
                await handleSubmit(newData)
            }}
        />
    );
};

export default TranslationEdit;