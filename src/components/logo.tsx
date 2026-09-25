import Link from "next/link";
import { cn } from "@/components/ui";

/**
 * The 5AM Apply "5" mark. By default it sits on a near-black rounded tile (like
 * an app icon) so it looks right on light and dark backgrounds alike.
 */
export function LogoMark({ size = 32, tile = true, className }: { size?: number; tile?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        tile && "overflow-hidden rounded-[24%] bg-[#0b0908] shadow-[0_6px_16px_-6px_rgb(255_106_0/0.55)] ring-1 ring-white/10",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={size > 72 ? "/brand/mark.webp" : "/brand/mark-192.webp"}
        alt=""
        width={size}
        height={size}
        className={tile ? "h-[88%] w-[88%]" : "h-full w-full"}
        draggable={false}
      />
    </span>
  );
}

/** Mark + "5AM APPLY" wordmark, coloured like the logo (orange "5AM", light/dark "APPLY"). */
export function Logo({ href = "/", className, size = 32 }: { href?: string; className?: string; size?: number }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-lg", className)}>
      <LogoMark size={size} />
      <span className="whitespace-nowrap text-[16px] font-extrabold uppercase leading-none tracking-[0.02em]">
        <span className="text-primary-text">5AM</span> <span className="text-fg">Apply</span>
      </span>
    </Link>
  );
}
