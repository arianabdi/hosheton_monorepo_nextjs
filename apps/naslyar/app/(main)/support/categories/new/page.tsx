'use client';

import React from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import SupportGuide from '../../components/SupportGuide';
import CategoryForm from '../../components/CategoryForm';

export default function NewSupportCategoryPage() {
    return (
        <Container>
            <Wrapper>
                <SupportGuide variant="categories" />
                <CategoryForm />
            </Wrapper>
        </Container>
    );
}
