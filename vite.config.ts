import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import dotenv from 'dotenv';

dotenv.config(); // load env vars from .env
export default defineConfig({
  plugins: [react(), viteTsconfigPaths(), nodePolyfills()],
  // Preserve MUI 5's CommonJS imports until they support Vite 8's import behavior.
  legacy: { inconsistentCjsInterop: true },
  envPrefix: 'REACT_APP_',
  preview: {
    allowedHosts: ['.mitre.org', '.elb.us-east-1.amazonaws.com']
  },
  define: {
    'import.meta.env.INTERMEDIARY_SERVER_BASE': JSON.stringify(
      process.env.INTERMEDIARY_SERVER_BASE
    ),
    'import.meta.env.USE_INTERMEDIARY': JSON.stringify(process.env.USE_INTERMEDIARY)
  },
  // depending on your application, base can also be "/"
  base: process.env.REACT_APP_VITE_BASE || '',
  server: {
    port: parseInt(process.env.PORT!),
    open: false,
    host: true,
    allowedHosts: ['.mitre.org', '.elb.us-east-1.amazonaws.com']
  }
});
