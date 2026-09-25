import Link from "next/link";
import { cn } from "@/components/ui";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_100%)] shadow-[0_4px_12px_-2px_rgb(79_70_229/0.45)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path d="M5.5 12.5l4 4 9-9.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.6 1.8l.55 1.5 1.5.55-1.5.55-.55 1.5-.55-1.5-1.5-.55 1.5-.55z" fill="#fff" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className, invert }: { href?: string; className?: string; invert?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-lg text-[17px] font-extrabold tracking-[-0.02em]", className)}>
      <LogoMark />
      <span className={invert ? "text-white" : "text-fg"}>
        Open<span className={invert ? "text-[#c7d2fe]" : "text-primary-text"}>Apply</span>
      </span>
    </Link>
  );
}
