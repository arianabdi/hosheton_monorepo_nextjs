import React from "react";

export const getFileIcon = (extension: string) => {
    const ext = extension?.toLowerCase?.() || "";
    const color = ext === "pdf" ? "#F23E3E" : ext === "zip" || ext === "rar" ? "#EBBE19" : "#54A0FF";

    return (
        <svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 2C0 0.89543 0.895431 0 2 0H17.5587C18.073 0 18.5676 0.198152 18.9396 0.553289L25.221 6.54909C25.6163 6.92648 25.84 7.44923 25.84 7.9958V32C25.84 33.1046 24.9446 34 23.84 34H2C0.895429 34 0 33.1046 0 32V2Z" fill={color}/>
            <path d="M15 9V3.24536C15 2.37959 16.0254 1.9229 16.669 2.50207L23.063 8.25671C23.7442 8.8698 23.3105 10 22.394 10H16C15.4477 10 15 9.55229 15 9Z" fill="white"/>
        </svg>
    );
};
