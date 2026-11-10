// Import the CSS that contains @font-face declarations
import './bhoma.module.scss';

// Export the font family name as a constant
export const bhoma = 'bhoma';

// Optional: Export the CSS module classes if needed
export { default as bhomaStyles } from './bhoma.module.scss';

// Export a helper to get the font family string
export const getBhomaFontFamily = () => 'bhoma';