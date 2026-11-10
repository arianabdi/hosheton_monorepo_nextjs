'use client';

import type { ComponentType } from 'react';
import Image from 'next/image';
import MiniIconDark from '@/app/assets/hooshetun/mini-icon-dark.svg';

type BrandMiniIconProps = {
    className?: string;
    size?: number;
};

export default function BrandMiniIcon({ className, size = 22 }: BrandMiniIconProps) {
    if (typeof MiniIconDark === 'function') {
        const Icon = MiniIconDark as ComponentType<{ className?: string }>;
        return <Icon className={className} />;
    }
    return (
        <Image
            src={MiniIconDark}
            alt=""
            width={size}
            height={size}
            className={className}
            priority
        />
    );
}
