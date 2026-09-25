import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const description =
  "Find. Tailor. Apply. Free, open-source job search across dozens of boards. AI scores how well you fit and writes a tailored application for every role.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "5AM Apply",
  title: { default: "5AM Apply · Find. Tailor. Apply.", template: "%s · 5AM Apply" },
  description,
  openGraph: {
    title: "5AM Apply · Find. Tailor. Apply.",
    description,
    siteName: "5AM Apply",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "5AM Apply · Find. Tailor. Apply.", description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0908" },
  ],
  colorScheme: "light dark",
};

// Applies a saved light/dark choice before the first paint (no flash). "System" stores nothing.
// Also turns hover effects on at the first mouse/trackpad movement: touchscreen laptops
// often report "no hover" even though their trackpad can hover.
const themeScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("oa-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}function h(e){if(e.pointerType==="mouse"||e.pointerType==="pen"){d.setAttribute("data-hover","");removeEventListener("pointermove",h)}}addEventListener("pointermove",h,{passive:true})})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${mono.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg">
        <a
          href="#main"
          className="sr-only z-[100] rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-fg shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
