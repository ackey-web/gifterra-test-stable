// src/utils/confetti.ts
/**
 * 軽量なコンフェッティ（紙吹雪）エフェクト
 * canvas-confettiを動的importして使用
 */

let confettiModule: any = null;

/**
 * canvas-confettiモジュールを動的にロード
 */
async function loadConfetti() {
  if (confettiModule) return confettiModule;
  
  try {
    confettiModule = await import('canvas-confetti');
    return confettiModule.default || confettiModule;
  } catch (error) {
    console.warn('canvas-confetti failed to load:', error);
    return null;
  }
}

/**
 * prefers-reduced-motionの確認
 */
function shouldReduceMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * コンフェッティを発火する
 */
export async function burstConfetti(): Promise<void> {
  if (shouldReduceMotion()) {
    console.log('Confetti skipped due to prefers-reduced-motion');
    return;
  }

  const confetti = await loadConfetti();
  if (!confetti) return;

  // メインバースト
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
  });

  // 左右からの追加バースト
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe']
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#00b894', '#00cec9', '#e17055', '#e84393']
    });
  }, 400);
}

/**
 * シンプルなコンフェッティ（控えめ）
 */
export async function simpleConfetti(): Promise<void> {
  if (shouldReduceMotion()) return;

  const confetti = await loadConfetti();
  if (!confetti) return;

  confetti({
    particleCount: 50,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#ffd93d', '#6bcf7f', '#4d96ff', '#ff6b9d']
  });
}