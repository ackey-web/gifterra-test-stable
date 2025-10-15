import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // チャンクサイズ警告の閾値を2MBに設定（大きなWeb3ライブラリを考慮）
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 大きなライブラリを別チャンクに分割してパフォーマンス向上
        manualChunks: {
          // React関連
          vendor: ['react', 'react-dom'],
          // ThirdWeb関連（大きなライブラリ）
          thirdweb: ['@thirdweb-dev/react', '@thirdweb-dev/sdk'],
          // Web3関連のウォレットコネクター
          wallets: [
            '@thirdweb-dev/wallets/evm/connectors/metamask',
            '@thirdweb-dev/wallets/evm/connectors/coinbase-wallet',
            '@thirdweb-dev/wallets/evm/connectors/wallet-connect'
          ],
        }
      }
    }
  }
})
