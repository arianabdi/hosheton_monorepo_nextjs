'use client';

import { use } from 'react';
import PersonaForm from '../components/PersonaForm';

export default function EditPersonaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <PersonaForm key={id} personaId={id} />;
}
