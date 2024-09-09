import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "react-quill/dist/quill.core.css";
import "react-quill/dist/quill.snow.css";
import "react-quill/dist/quill.bubble.css";

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
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
