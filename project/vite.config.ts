import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ['jsx', 'typescript'], // Explicit TSX parsing
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    jsx: 'automatic', // Modern JSX handling
    target: 'es2020', // Match TS target
    tsconfigRaw: {
      compilerOptions: {
        // Force consistent JSX parsing
        jsx: 'react-jsx',
        jsxImportSource: 'react',
      },
    },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'recharts'],
          state: ['zustand'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Ensure TS version matches project
      tsconfig: './tsconfig.json',
    },
  },
});