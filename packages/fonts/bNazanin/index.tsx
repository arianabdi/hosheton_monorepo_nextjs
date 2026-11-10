// Import the CSS that contains @font-face declarations
import './bnazanin.module.scss';

// Export the font family name as a constant
export const bnazanin = 'bnazanin';

// Optional: Export the CSS module classes if needed
export { default as bnazaninStyles } from './bnazanin.module.scss';

// Export a helper to get the font family string
export const getBnazaninFontFamily = () => 'bnazanin';