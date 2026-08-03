import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 相对路径，适配 GitHub Pages 任意仓库名
export default defineConfig({
  plugins: [react()],
  base: './',
})
