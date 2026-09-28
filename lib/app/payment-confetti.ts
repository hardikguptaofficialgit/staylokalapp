type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "rect" | "circle";
  life: number;
  maxLife: number;
};

const PALETTE = [
  "#4b9b6b",
  "#5ec4a8",
  "#c99834",
  "#e8b84a",
  "#7eb8ff",
  "#c77dff",
  "#ff6b9d",
  "#ffffff",
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createBurst(
  particles: Particle[],
  originX: number,
  originY: number,
  count: number,
  spread: number,
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = randomBetween(-Math.PI * 0.85, -Math.PI * 0.15);
    const speed = randomBetween(spread * 0.55, spread);
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed + randomBetween(-1.2, 1.2),
      vy: Math.sin(angle) * speed - randomBetween(2, 6),
      w: randomBetween(5, 9),
      h: randomBetween(4, 11),
      rotation: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.22, 0.22),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? "#4b9b6b",
      shape: Math.random() > 0.35 ? "rect" : "circle",
      life: 0,
      maxLife: randomBetween(2.2, 3.4) * 60,
    });
  }
}

/**
 * Full-viewport party-popper style confetti. No-op when reduced motion is preferred.
 */
export function firePaymentConfetti(): void {
  if (prefersReducedMotion() || typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100;";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const w = window.innerWidth;
  const h = window.innerHeight;
  const particles: Particle[] = [];

  createBurst(particles, w * 0.5, h * 0.42, 90, 14);
  window.setTimeout(() => createBurst(particles, w * 0.22, h * 0.55, 45, 11), 120);
  window.setTimeout(() => createBurst(particles, w * 0.78, h * 0.55, 45, 11), 220);

  let frame = 0;
  const maxFrames = 220;

  const tick = () => {
    frame += 1;
    ctx.clearRect(0, 0, w, h);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life += 1;
      if (p.life > p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      p.vy += 0.28;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;

      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    if (frame < maxFrames || particles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      window.removeEventListener("resize", resize);
      canvas.remove();
    }
  };

  requestAnimationFrame(tick);
}
