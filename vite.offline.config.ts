import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

export default defineConfig({
 root:fileURLToPath(new URL('./offline',import.meta.url)),
 publicDir:fileURLToPath(new URL('./public',import.meta.url)),
 base:'/',
 plugins:[react()],
 css:{postcss:{plugins:[tailwindcss()]}},
 resolve:{dedupe:['react','react-dom']},
 build:{
  outDir:fileURLToPath(new URL('./dist-offline',import.meta.url)),
  emptyOutDir:true,
 },
});

