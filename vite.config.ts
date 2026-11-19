import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // The README tells people to set GEMINI_API_KEY. API_KEY is still accepted
  // for older setups (for example Google AI Studio).
  const geminiApiKey = env.GEMINI_API_KEY || env.API_KEY || "";

  if (!geminiApiKey) {
    console.warn(
      "\n[Ask DHARMA] GEMINI_API_KEY is not set. Chat, document scan and voice will not work.\n" +
      "Add GEMINI_API_KEY=<your key> to .env.local.\n"
    );
  } else if (mode === 'production') {
    console.warn(
      "\n[Ask DHARMA] The Gemini API key is built into the public JavaScript bundle.\n" +
      "Anyone who opens the site can copy it. Restrict the key before you deploy:\n" +
      "see \"Protect your Gemini API key\" in README.md.\n"
    );
  }

  return {
    plugins: [react()],
    define: {
      // Shim process.env.API_KEY for the GenAI SDK.
      // Falls back to an empty string so the app does not crash if the key is missing.
      'process.env.API_KEY': JSON.stringify(geminiApiKey),
    },
    server: {
      port: 3000
    }
  }
})
