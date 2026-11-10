// app/(main)/layout.js
import styles from './layout.module.scss';
import PageTransition from "@/app/components/PageTransition";
import {iransansxvf} from "@my-workspace/fonts/iransansxvf";
import {AuthHeader} from "@/app/components/AuthHeader";
import AuthFrame from "./components/authFrame/authFrame";

export default function MainLayout({children}) {
    return (
        <div className={`${styles.container} ${iransansxvf.className}`}>
            <div style={{position: 'relative', height: "100%"}}>
                <AuthFrame>
                    <PageTransition>
                        <div className={styles.outlet}>
                            {children}
                        </div>
                    </PageTransition>
                </AuthFrame>
            </div>
        </div>
    );
}