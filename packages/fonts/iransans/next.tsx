import localFont from 'next/font/local';

// Using next/font/local for better performance
export const iransans = localFont({
    src: [
        {
            path: './UltraLight.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: './Light.ttf',
            weight: '600',
            style: 'normal',
        },
        {
            path: './Medium.ttf',
            weight: '800',
            style: 'normal',
        },
        {
            path: './Bold.ttf',
            weight: '900', // Extra bold typically 900
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-iransans', // Optional CSS variable
});

// Also export the font family name for compatibility
export const iransansFontFamily = 'iransans';