'use client';

import { StarterWelcome } from './components/StarterWelcome';
import styles from './StarterPage.module.scss';

export default function StudioStarterPage() {
    return (
        <main className={styles.page}>
            <StarterWelcome />
        </main>
    );
}
