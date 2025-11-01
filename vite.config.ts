import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@privy-io/react-auth'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  server: {
    headers: {
      // Thirdweb embeddedWallet (Google OAuth) のために COOP を最大限緩和
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
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
          // Privy認証関連
          privy: ['@privy-io/react-auth'],
        }
      }
    }
  }
})
