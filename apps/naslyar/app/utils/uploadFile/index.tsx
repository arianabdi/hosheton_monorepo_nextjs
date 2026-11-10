'use client'

import axios from "axios";
import {ErrorToaster} from "@my-workspace/utils";
import {useAppStore} from "@/app/zustand/store/useAppStore";

export const handleUpload = async (file, token, setProgress, onSuccess, onFailed, metadata?) => {

    const {baseUrl} = useAppStore.getState();
    try {
        const formData = new FormData();
        if (!file) {
            alert("لطفا یک فایل انتخاب کنید");
            return;
        }


        formData.append('file', file);

        if (metadata) {
            Object.keys(metadata).forEach(key => {
                formData.append(key, metadata[key]);
            });
        }


        const res = await axios.post(`${baseUrl}/api/file/multer/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    authorization: `Bearer ${token}`
                },

                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                    // console.log(`Upload Progress: ${progress}%`, file);
                    setProgress({progress: progress, status: 'uploading'})
                    // Optionally update UI with progress
                    // e.g., setUploadProgress(progress)
                },
            });


        if(res.status === 200){
            setProgress({progress: 100, status: 'done'})
            onSuccess({...res.data.data, progress: 100, status: 'done'})
        }


        return res.data.data;

    } catch (error) {
        ErrorToaster(error)
        setProgress({progress: 0,status: 'error'})
        onFailed(error)
    }


};