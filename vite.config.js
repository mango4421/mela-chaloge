import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{input:{main:'index.html',admin:'admin.html'},output:{manualChunks:id=>id.includes('/node_modules/three/')?'three':undefined}}}});
