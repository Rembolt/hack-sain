import type { Metadata } from "next";
import { NorthFlowHeader } from "@/components/northflow-header";
import { NorthFlowProvider } from "@/state/northflow-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "NorthFlow | Prevent billing complaints",
  description:
    "An ML-assisted billing reliability layer with explainable risk assessment and verified feedback.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NorthFlowProvider>
          <NorthFlowHeader />
          {children}
        </NorthFlowProvider>
      </body>
    </html>
  );
}
