import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/auth': 'http://localhost:3000',
      '/me': 'http://localhost:3000',
      '/teams': 'http://localhost:3000',
      '/missions': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
  },
});
