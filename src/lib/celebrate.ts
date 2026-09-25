// A short confetti burst for happy moments (like marking an application as
// sent). Pure DOM + Web Animations, no dependencies, skipped for people who
// prefer reduced motion.

const COLORS = ["#ffb000", "#ff8a00", "#ff6a00", "#e94e0a", "#ffd166", "#17110b"];

export function celebrate(from?: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:100;overflow:hidden";
  document.body.appendChild(layer);

  const x = from?.x ?? window.innerWidth / 2;
  const y = from?.y ?? window.innerHeight / 3;

  for (let i = 0; i < 44; i++) {
    const piece = document.createElement("span");
    const w = 6 + Math.random() * 6;
    piece.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${w * 0.45}px;border-radius:2px;background:${COLORS[i % COLORS.length]}`;
    layer.appendChild(piece);

    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 200;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 90;
    const spin = Math.random() * 720 - 360;
    piece.animate(
      [
        { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg)`, opacity: 1, offset: 0.65 },
        { transform: `translate(${dx * 1.15}px, ${dy + 180}px) rotate(${spin * 1.6}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 600, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" },
    );
  }

  setTimeout(() => layer.remove(), 1900);
}
