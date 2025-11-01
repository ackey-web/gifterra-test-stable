import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
    dedupe: ['@privy-io/react-auth'],
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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('@thirdweb-dev')) {
              return 'thirdweb';
            }
            if (id.includes('@privy-io/react-auth')) {
              return 'privy';
            }
          }
        }
      }
    }
  }
})
