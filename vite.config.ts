import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  server: {
    proxy: {
      // API リクエストを Vercel 開発サーバー（3001）にプロキシ
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'es2020',
    // チャンクサイズ警告の閾値を2MBに設定（大きなWeb3ライブラリを考慮）
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        // 大きなライブラリを別チャンクに分割してパフォーマンス向上
        manualChunks: {
          // React関連
          vendor: ['react', 'react-dom'],
          // ThirdWeb関連（大きなライブラリ）
          thirdweb: ['@thirdweb-dev/react', '@thirdweb-dev/sdk'],
        }
      }
    }
  }
})
