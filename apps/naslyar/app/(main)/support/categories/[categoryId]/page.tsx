'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import SupportGuide from '../../components/SupportGuide';
import CategoryForm from '../../components/CategoryForm';
import { SupportCategory, listCategories } from '../../lib/support-api';

export default function EditSupportCategoryPage() {
    const router = useRouter();
    const params = useParams();
    const categoryId = String(params.categoryId || '');
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<SupportCategory | null>(null);

    const load = useCallback(async () => {
        if (!token || !categoryId) return;
        try {
            setLoading(true);
            const categories = await listCategories(baseUrl, token);
            const found = categories.find((c) => c._id === categoryId) || null;
            if (!found) {
                ErrorToaster(new Error('دسته‌بندی مورد نظر یافت نشد.'));
                router.replace('/support/categories');
                return;
            }
            setCategory(found);
        } catch (error) {
            ErrorToaster(error);
            router.replace('/support/categories');
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, categoryId, router]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Container>
            <Wrapper>
                {loading ? <LoadingState /> : (
                    <>
                        <SupportGuide variant="categories" />
                        <CategoryForm category={category} />
                    </>
                )}
            </Wrapper>
        </Container>
    );
}
