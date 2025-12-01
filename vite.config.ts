import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 确保构建路径正确，如果是部署到 GitHub Pages 的子目录，需要修改 base
  base: './', 
})