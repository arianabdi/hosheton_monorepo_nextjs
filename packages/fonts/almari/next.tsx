import localFont from 'next/font/local';

// Using next/font/local for better performance
export const almari = localFont({
    src: [
        {
            path: './Almarai-Light.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: './Almarai-Regular.ttf',
            weight: '600',
            style: 'normal',
        },
        {
            path: './Almarai-Bold.ttf',
            weight: '800',
            style: 'normal',
        },
        {
            path: './Almarai-ExtraBold.ttf',
            weight: '900', // Extra bold typically 900
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-almari', // Optional CSS variable
});

// Also export the font family name for compatibility
export const almariFontFamily = 'almari';