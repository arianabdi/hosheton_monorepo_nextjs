import Image from 'next/image';
import LogoDark from '@/app/assets/hooshetun/logo-dark.svg';
import LogoLight from '@/app/assets/hooshetun/logo-light.svg';
import styles from './content.module.scss';

/**
 * لوگوی هوشتون برای سرور کامپوننت‌ها (فوتر، بنر مستندات):
 * هر دو نسخه در HTML؛ CSS بر اساس data-theme ریشه یکی را نشان می‌دهد (سرور به store تم دسترسی ندارد).
 */
export function ThemedLogo({ alt = 'هوشتون', priority }: { alt?: string; priority?: boolean }) {
    return (
        <>
            <Image src={LogoDark} alt={alt} className={styles.logoOnLight} priority={priority} />
            <Image src={LogoLight} alt="" aria-hidden className={styles.logoOnDark} priority={priority} />
        </>
    );
}
