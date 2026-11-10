import styles from "./Wizard.module.scss";
import {useWizard} from "./WizardContext";

export function Wizard({ children }: any) {
    const { step } = useWizard();

    const steps = Array.isArray(children) ? children : [children];
    const totalSteps = steps.length;

    const progressPercent = ((step - 1) / (totalSteps - 1)) * 100;

    return (
        <div className={styles.wizard}>

            {/* Progress */}
            <div className={styles.progress}>
                <div className={styles.bar} style={{ width: `${progressPercent}%` }} />
            </div>

            {/* Render current step */}
            <div className={styles.stepContainer}>
                {steps[step - 1]}
            </div>
        </div>
    );
}
