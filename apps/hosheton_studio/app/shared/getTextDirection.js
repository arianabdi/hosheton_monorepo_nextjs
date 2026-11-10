export function GetDirection(text) {
    if (!text) return "ltr";

    // حذف فاصله‌ها و کاراکترهای غیرحرفی ابتدای متن
    const firstChar = text.trim().charAt(0);

    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(firstChar)) {
        return "rtl";
    }

    if (/[A-Za-z]/.test(firstChar)) {
        return "ltr";
    }

    // پیش‌فرض
    return "ltr";
}


export default GetDirection;