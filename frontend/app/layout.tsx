import "./globals.css";
import { Inter, Space_Grotesk } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import Providers from "@/components/layout/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "VehiclePart — India's Vehicle Spare Parts Marketplace",
  description:
    "Find genuine and compatible spare parts for cars, bikes, trucks, tractors and EVs from verified sellers across India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
