import localFont from 'next/font/local';

// Using next/font/local for better performance
export const peyda = localFont({
    src: [
        {
            path: './Peyda-light.ttf',
            weight: '100',
            style: 'normal',
        },
        {
            path: './Peyda-Thin.ttf',
            weight: '200',
            style: 'normal',
        },
        {
            path: './Peyda-Medium.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: './Peyda-Regular.ttf',
            weight: '400', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Peyda-Regular.ttf',
            weight: '500', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Peyda-Bold.ttf',
            weight: '600', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Peyda-Bold.ttf',
            weight: '700', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Peyda-Black.ttf',
            weight: '800', // Extra bold typically 900
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-peyda', // Optional CSS variable
});

// Also export the font family name for compatibility
export const peydaFontFamily = 'peyda';