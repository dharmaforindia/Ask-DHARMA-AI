import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Shim process.env.API_KEY for the GenAI SDK
      // Provide fallback to empty string to prevent runtime crash if var is missing
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
    },
    server: {
      port: 3000
    }
  }
})