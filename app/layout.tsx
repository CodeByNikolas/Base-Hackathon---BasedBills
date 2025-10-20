import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { RootProvider } from "./rootProvider";
import "./globals.css";

// Component to add custom meta tags for mini-app
function MiniAppMeta() {
  return (
    <meta
      name="fc:miniapp"
      content={JSON.stringify({
        "version": "next",
        "imageUrl": "https://base-hackathon-based-bills.vercel.app/basedbills_logo.png",
        "button": {
          "title": "Open BasedBills",
          "action": {
            "type": "launch_miniapp",
            "name": "BasedBills",
            "url": "https://base-hackathon-based-bills.vercel.app"
          }
        }
      })}
    />
  );
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_PROJECT_NAME || "BasedBills",
  description:
    "The easiest way to split expenses on Base. Connect your wallet and start managing group expenses with USDC settlements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <MiniAppMeta />
      </head>
      <body className={`${inter.variable} ${sourceCodePro.variable}`}>
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
