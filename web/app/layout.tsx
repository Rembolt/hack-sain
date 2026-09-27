import "@mantine/core/styles.layer.css";
import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Source_Sans_3 } from "next/font/google";
import { Brand } from "./brand";
import { SchemeSwitch } from "./scheme-switch";
import { theme } from "@/lib/theme";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: "300",
  variable: "--font-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "hack-sain",
  icons: {
    icon: [
      { url: "/north-arrow-logo/svg/favicon-adaptive.svg", type: "image/svg+xml" },
      { url: "/north-arrow-logo/favicon.ico" },
    ],
    apple: "/north-arrow-logo/png/tile-light-180.png",
  },
};

const schemeBoot = `try{if(localStorage.getItem("hack-sain-scheme")==="dark")document.documentElement.dataset.scheme="dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" {...mantineHtmlProps} className={sourceSans.variable}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
        <script dangerouslySetInnerHTML={{ __html: schemeBoot }} />
      </head>
      <body className={sourceSans.className}>
        <MantineProvider theme={theme} forceColorScheme="light">
          <header className="site-bar">
            <Brand size={32} priority />
            <SchemeSwitch />
          </header>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
