import localFont from 'next/font/local';

// Using next/font/local for better performance
export const iransansxvf = localFont({
    src: [
        {
            path: './iransansxvf.ttf',
            weight: '400',
            style: 'normal',
        }
    ],
    display: 'swap',
    variable: '--font-iransansxvf', // Optional CSS variable
});

// Also export the font family name for compatibility
export const iransansxvfFontFamily = 'iransansxvf';