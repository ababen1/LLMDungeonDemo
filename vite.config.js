import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const localTarget = env.VITE_LOCAL_LLM_PROXY_TARGET;

  const server = localTarget
    ? {
        proxy: {
          '/api/v1/chat': {
            target: localTarget,
            changeOrigin: true,
          },
        },
      }
    : undefined;

  return {
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
    },
    server,
  };
});
