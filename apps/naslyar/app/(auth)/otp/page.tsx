'use client'


import React, {useState} from 'react';
import styles from './phoneNumberPage.module.scss';
// import { useNavigate } from 'react-router-dom';
import {useRouter} from "next/navigation";
import {OtpComponent} from "@my-workspace/components";

export function LinkUrl({...props}) {
    return (
        <span {...props} className={styles.LinkUrl}>
            {props.children}
        </span>
    )
}

export default function Otp() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    // const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (phone.length === 11 && phone.startsWith('09')) {
            router.push(`./sms-code?number=${phone}`)
            // navigate('/sms-code', { state: { phone } });
        } else {
            alert('شماره تلفن معتبر نیست. از حروف انگلیسی استفاده کنید!');
        }
    };

    return (
        <OtpComponent
            phone={phone}
            setPhone={setPhone}
            onSubmit={handleSubmit}
            onLogin={() => {
                router.push('./login')
            }}
        />
    );
}
