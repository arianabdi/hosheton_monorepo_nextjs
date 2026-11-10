// app/(main)/layout.js
import styles from './layout.module.scss';
import PageTransition from "@/app/components/PageTransition";
import {iransans} from "@my-workspace/fonts/iransans";
import AuthHeader from "@/app/components/header/AuthHeader";
import AuthFrame from "@/app/(auth)/components/authFrame/page";

export default function MainLayout({children}: { children: React.ReactNode }) {
    return (
        <div className={`${styles.container} ${iransans.className}`}>
            {/*<AuthHeader title="هوشتون"/>*/}
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
                <AuthFrame>
                    <PageTransition>
                        {children}
                    </PageTransition>
                </AuthFrame>
            </div>
        </div>
    );
}