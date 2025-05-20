import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import dotenv from 'dotenv';

dotenv.config(); // load env vars from .env
export default defineConfig({
  plugins: [react(), viteTsconfigPaths(), nodePolyfills()],
  preview: {
    allowedHosts: [".mitre.org", ".us-east-1.elb.amazonaws.com"],
  },
  define: {
    'process.env': process.env
  },
  // depending on your application, base can also be "/"
  base: process.env.REACT_APP_VITE_BASE || '',
  server: {
    port: parseInt(process.env.PORT!),
    open: false,
    host: true
  }
});
