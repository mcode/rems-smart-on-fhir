import { from } from 'env-var';

// Vite exposes these settings to the browser
export default from(import.meta.env);
