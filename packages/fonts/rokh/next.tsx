import localFont from 'next/font/local';

// Using next/font/local for better performance
export const rokh = localFont({
    src: [
        {
            path: './Rokh-Light.ttf',
            weight: '100',
            style: 'normal',
        },
        {
            path: './Rokh-Thin.ttf',
            weight: '200',
            style: 'normal',
        },
        {
            path: './Rokh-Medium.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: './Rokh-Normal.ttf',
            weight: '400', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Rokh-Regular.ttf',
            weight: '500', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Rokh-SemiBold.ttf',
            weight: '600', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Rokh-Bold.ttf',
            weight: '700', // Extra bold typically 900
            style: 'normal',
        },
        {
            path: './Rokh-Black.ttf',
            weight: '800', // Extra bold typically 900
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-rokh', // Optional CSS variable
});

// Also export the font family name for compatibility
export const rokhFontFamily = 'rokh';