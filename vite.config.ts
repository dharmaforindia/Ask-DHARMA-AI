import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Shim process.env.API_KEY for the GenAI SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Shim process.env for other libraries if needed (like Firebase legacy access)
      'process.env': process.env
    },
    server: {
      port: 3000
    }
  }
})