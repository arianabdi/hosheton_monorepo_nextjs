'use client'

import React, {useEffect, useState} from "react";
import {RegisterComponent} from "@my-workspace/components";
import axios from "axios";
import {useRouter} from "next/navigation";


export default function  Register ()  {
    const router = useRouter();
    
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        repeatPassword: "",
    });
    
    const register = async () => {
        try {
            setIsSubmitting(true);
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/register`, form);

            if (res.data.statusCode === 200 || res.data.statusCode === 201) {
                // SuccessToaster({message: 'ثبت نام با موفقیت انجام شد'}, t)
                // navigate(`/login`);
                setIsSubmitting(false);
            }

        } catch (e) {
            // ErrorToaster(e, t)
            setIsSubmitting(false);
        }

    };

    return (
        <RegisterComponent
            form={form}
            setForm={(e) => {
                setForm(e)
            }}
            loading={isSubmitting}
            onSubmit={register}
            onLogin={() => {
                router.push('/login')
            }}
        />


    )
}
