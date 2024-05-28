import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import dotenv from 'dotenv';

dotenv.config(); // load env vars from .env
export default defineConfig({
  // depending on your application, base can also be "/"
  base: '',
  plugins: [react(), viteTsconfigPaths(), nodePolyfills()],
  define: {
    'process.env': process.env
  },
  server: {
    port: parseInt(process.env.PORT!),
    open: false,
    host: true
  }
});
