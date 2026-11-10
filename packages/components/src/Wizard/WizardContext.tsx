'use client'

import {createContext, useContext, useState} from "react";


const WizardContext = createContext<any>(null);

export function WizardProvider({ children }: any) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<any>();

    const updateData = (key: any, value: any) => {
        setData((prev: any) => ({ ...prev, [key]: value }));
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <WizardContext.Provider value={{ step, data, updateData, nextStep, prevStep }}>
            {children}
        </WizardContext.Provider>
    );
}

export const useWizard = () => useContext(WizardContext);
