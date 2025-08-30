import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';  // <-- plugin


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
