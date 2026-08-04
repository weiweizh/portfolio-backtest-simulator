import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  // Force rebuild
  define: {
    __BUILD_TIME__: JSON.stringify(Date.now())
  }
})
