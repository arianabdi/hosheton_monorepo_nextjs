// Import the CSS that contains @font-face declarations
import './almari.module.scss';

// Export the font family name as a constant
export const almari = 'almari';

// Optional: Export the CSS module classes if needed
export { default as almariStyles } from './almari.module.scss';

// Export a helper to get the font family string
export const getAlmariFontFamily = () => 'almari';