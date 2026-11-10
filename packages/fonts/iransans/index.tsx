// Import the CSS that contains @font-face declarations
import './iransans.module.scss';

// Export the font family name as a constant
export const iransans = 'iransans';

// Optional: Export the CSS module classes if needed
export { default as iransansStyles } from './iransans.module.scss';

// Export a helper to get the font family string
export const getIransansFontFamily = () => 'iransans';