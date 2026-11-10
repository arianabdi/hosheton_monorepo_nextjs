import localFont from 'next/font/local';

// Using next/font/local for better performance
export const shilia = localFont({
    src: [
        {
            path: './Shilia-130UltraLight.ttf',
            weight: '100',
            style: 'normal',
        },
        {
            path: './Shilia-230Thin.ttf',
            weight: '200',
            style: 'normal',
        },
        {
            path: './Shilia-330Light.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: './Shilia-430Regular.ttf',
            weight: '400', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Shilia-530Medium.ttf',
            weight: '500', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Shilia-630Bold.ttf',
            weight: '600', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Shilia-730Heavy.ttf',
            weight: '700', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Shilia-830Black.ttf',
            weight: '800', // Extra bold typically 900
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-shilia', // Optional CSS variable
});

// Also export the font family name for compatibility
export const shiliaFontFamily = 'shilia';