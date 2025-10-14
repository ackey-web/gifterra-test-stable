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
 * コンフェッティを発火する（汎用）
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
 * 投げ銭成功用コンフェッティ（独立実行）
 */
export async function tipSuccessConfetti(): Promise<void> {
  if (shouldReduceMotion()) {
    console.log('Tip confetti skipped due to prefers-reduced-motion');
    return;
  }

  const confetti = await loadConfetti();
  if (!confetti) return;

  // 投げ銭専用カラーパレット（温かい色調）
  const tipColors = ['#ff9a56', '#ffad56', '#ffc93c', '#ff6b9d', '#c44569'];
  
  // メインバースト
  await confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: tipColors,
    scalar: 1.2
  });

  // 遅延バースト（左右から）
  setTimeout(async () => {
    await confetti({
      particleCount: 40,
      angle: 60,
      spread: 50,
      origin: { x: 0.1, y: 0.7 },
      colors: tipColors
    });
  }, 300);

  setTimeout(async () => {
    await confetti({
      particleCount: 40,
      angle: 120,
      spread: 50,
      origin: { x: 0.9, y: 0.7 },
      colors: tipColors
    });
  }, 600);
}

/**
 * リワード受け取り成功用コンフェッティ（独立実行）
 */
export async function rewardSuccessConfetti(): Promise<void> {
  if (shouldReduceMotion()) {
    console.log('Reward confetti skipped due to prefers-reduced-motion');
    return;
  }

  const confetti = await loadConfetti();
  if (!confetti) return;

  // リワード専用カラーパレット（豪華な色調）
  const rewardColors = ['#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b'];
  
  // 豪華なメインバースト
  await confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.5 },
    colors: rewardColors,
    scalar: 1.4,
    gravity: 0.8
  });

  // 追加エフェクト（上から降る感じ）
  setTimeout(async () => {
    await confetti({
      particleCount: 60,
      angle: 90,
      spread: 120,
      origin: { x: 0.5, y: 0.2 },
      colors: rewardColors,
      gravity: 0.6
    });
  }, 400);

  // 最終フィニッシュ（左右から）
  setTimeout(async () => {
    await confetti({
      particleCount: 30,
      angle: 45,
      spread: 60,
      origin: { x: 0, y: 0.8 },
      colors: rewardColors
    });
    
    await confetti({
      particleCount: 30,
      angle: 135,
      spread: 60,
      origin: { x: 1, y: 0.8 },
      colors: rewardColors
    });
  }, 800);
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