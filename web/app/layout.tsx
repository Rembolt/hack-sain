import "@mantine/core/styles.layer.css";
import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Brand } from "./brand";
import { SchemeSwitch } from "./scheme-switch";
import { theme } from "@/lib/theme";
import "./globals.css";

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
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: schemeBoot }} />
      </head>
      <body>
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
