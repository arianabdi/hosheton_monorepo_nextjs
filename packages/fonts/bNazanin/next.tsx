import localFont from 'next/font/local';

// Using next/font/local for better performance
export const bnazanin = localFont({
    src: [
        {
            path: './bnazanin.ttf',
            weight: '400',
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-byekan', // Optional CSS variable
});

// Also export the font family name for compatibility
export const bnazaninFontFamily = 'bnazanin';