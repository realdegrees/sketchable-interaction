import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Toolbar from "@/ui/toolbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sketchable Interaction",
  description: "Sketchable Interaction is a generic interaction concept that empowers end-users to compose custom user interfaces by drawing interactive regions that represent user interface components",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="fixed inset-0">
          {children}
        </main>
        <div id="Toolbar" className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <Toolbar />
        </div>
      </body>
    </html>
  );
}
