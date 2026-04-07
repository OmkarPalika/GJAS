import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <ClientLayout>
          <div id="main-content">
            {children}
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}