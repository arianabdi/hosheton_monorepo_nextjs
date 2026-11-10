import localFont from 'next/font/local';

// Using next/font/local for better performance
export const morabba = localFont({
    src: [
        {
            path: './morabba-ultralight.ttf',
            weight: '100',
            style: 'normal',
        },
        {
            path: './morabba-light.ttf',
            weight: '200',
            style: 'normal',
        },
        {
            path: './morabba-medium.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: './morabba-regular.ttf',
            weight: '400', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './morabba-semibold.ttf',
            weight: '500', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './morabba-bold.ttf',
            weight: '600', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './morabba-extrabold.ttf',
            weight: '700', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './morabba-heavy.ttf',
            weight: '800', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './morabba-black.ttf',
            weight: '900', // Extra bold typically 900
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-morabba', // Optional CSS variable
});

// Also export the font family name for compatibility
export const morabbaFontFamily = 'morabba';