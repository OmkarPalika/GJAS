import { Inter, Playfair_Display, Geist } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { cn } from "@/lib/utils";
import Link from "next/link";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata = {
  title: "GJAS - Global Judicial Assembly Simulator",
  description: "A platform for AI-driven cross-jurisdictional legal deliberation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <Link href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md shadow-premium border border-primary/20">
          Skip to main content
        </Link>
        <ClientLayout>
          <div id="main-content">
            {children}
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}