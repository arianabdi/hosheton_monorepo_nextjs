'use client'

import React, {useState} from "react";
import axios from "axios";
import {ForgotPasswordComponent} from "@my-workspace/components";
import {useRouter} from "next/navigation";

export default function ForgotPassword() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState({
        email: "",
    });


    const forgotPassword = async () => {
        try {
            setIsSubmitting(true);
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/forgot-password`, form);

            if (res.data.statusCode === 200 || res.data.statusCode === 201) {
                // SuccessToaster({message: 'لینک تغییر پسورد به ایمیل شما ارسال شد'}, t)
                // navigate(`/login`);
            }
            setIsSubmitting(false);

        } catch (e) {
            // ErrorToaster(e, t)
            setIsSubmitting(false);
        }

    };
    return (

        <ForgotPasswordComponent
            form={form}
            setForm={(e) => {
                setForm(e)
            }}
            onSubmit={forgotPassword}
            onLogin={() => {
                router.push('/login')
            }}
        />


    )
}
