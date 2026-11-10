'use client'

import React, {useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from "next/navigation";
import {SmsCodeComponent} from "@my-workspace/components";


export default function SmsCodePage() {
    const [code, setCode] = useState(Array(5).fill(''));
    const router = useRouter();
    const searchParams = useSearchParams();
    const phone = searchParams.get('number') || '';

    const handleLogin = (otp) => {
        console.log('Verifying code:', otp);
        // navigate('/app/projects'); // redirect to next page
    };

    return (
        <SmsCodeComponent
            code={code}
            setCode={setCode}
            phone={phone}
            onSubmit={(e) => {
                handleLogin(e)
            }}
            onOtp={() => {
                router.push('/otp')
            }}
        />

    );
}
