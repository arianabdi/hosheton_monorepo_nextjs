import { ErrorToaster, SuccessToaster } from "@my-workspace/utils";

export function CopyToClipboard(value: any, t?: any) {
    if (typeof window === "undefined") return;

    // Helper function for the fallback method
    const runFallback = () => {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        // Make it invisible but append it to the DOM
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            SuccessToaster({message: "مقدار مورد نظر کپی شد"});
        } catch (err) {
            console.error('Fallback failed: ', err);
            ErrorToaster({message: "مقدار مورد نظر کپی نشد"});
        }
        document.body.removeChild(textArea);
    };

    // Try modern Clipboard API first
    if (navigator.clipboard) {
        navigator.clipboard.writeText(value)
            .then(() => {
                SuccessToaster({message: "مقدار مورد نظر کپی شد"});
            })
            .catch(err => {
                console.warn('Modern clipboard failed, trying fallback...', err);
                // 💡 IF permission is denied, run the fallback instead of failing!
                runFallback();
            });
    } else {
        // Fallback for older browsers
        runFallback();
    }
}
