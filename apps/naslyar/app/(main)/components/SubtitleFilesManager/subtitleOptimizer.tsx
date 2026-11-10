'use client';

import React, { useRef, useState } from 'react';
import axios from "axios";
import {ErrorToaster, SuccessToaster} from "@my-workspace/utils/src";
import {useAppStore} from "@/app/zustand/store/useAppStore";

export function SubtitleOptimizer({component, loading,  onSuccess, onFail, params}) {


    const { id } = React.use(params);
    // const {id} = useParams();
    const subtitleInputRef = useRef(null);
    const [subtitleSelected, setSubtitleSelected] = useState(false);
    const [subtitles, setSubtitles] = useState([]);
    const [subtitleFiles, setSubtitleFiles] = useState([]);
    const {baseUrl} = useAppStore();
    const handleButtonClick = () => {
        // Open the hidden file input dialog
        subtitleInputRef.current.click();
    };

    const handleSubtitleChange = (event) => {
        const name = prompt("Enter subtitle language:");
        const file = event.target.files[0];


        // Read subtitle file
        const reader = new FileReader();
        reader.onload = (e) => {
            parseSubtitles( e.target.result, event.target.files[0].name, name, );
        };
        reader.readAsText(file);
        if (event.target.files.length > 0) {
            setSubtitleSelected(true);
            setSubtitleFiles(prevState => {
                return [
                    ...prevState,
                    event.target.files[0]
                ]
            })
        } else {
            setSubtitleSelected(false);
        }
    };



    const parseSubtitles = async (content, fileName, lang) => {

        console.log('lang', lang || null)
        if(!lang)
            return 0;

        const subtitleLines = content.split("\n");
        const parsedSubtitles = [];
        let index = 0;
        let currentSubtitle = {index: 0, time: "", text: "", isActive: false};
        for (let i = 0; i < subtitleLines.length; i++) {
            const line = subtitleLines[i].trim();
            if (line === "") {
                if (currentSubtitle.text !== "") {
                    parsedSubtitles.push(currentSubtitle);
                    currentSubtitle = {index: 0, time: "", text: "", isActive: false};
                }
            } else if (!isNaN(Number(line))) {
                currentSubtitle.index = parseInt(line);
            } else if (line.includes("-->")) {
                currentSubtitle.time = line;
            } else {
                currentSubtitle.text += line + " ";
            }
        }
        if (currentSubtitle.text !== "") {
            parsedSubtitles.push(currentSubtitle);
        }


        const newSubtitle = {
            fileName: fileName,
            lang: lang,
            content: parsedSubtitles
        }
        const updatedSubtitleFiles = [
            ...subtitleFiles,
            newSubtitle
        ]

        setSubtitles(parsedSubtitles);
        setSubtitleFiles(updatedSubtitleFiles)


        try {


            const res = await axios.put(`${baseUrl}/api/video-player/subtitle/${id}`,
                {
                    subtitleFiles: updatedSubtitleFiles || [],
                },
                // {headers: {authorization: `Bearer ${auth.token}`}}
            );

            if (res.data.statusCode === 200 || res.data.statusCode === 201) {
                onSuccess()
                SuccessToaster({message: 'زیر نویس با موفقیت اضافه شد'})
            }

        } catch (e) {
            ErrorToaster(e)
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <div disabled={loading} onClick={handleButtonClick}>{component}</div>

            <input
                type="file"
                accept=".srt,.ass"
                ref={subtitleInputRef}
                onChange={handleSubtitleChange}
                style={{ display: 'none' }}
            />
        </div>
    );
}


