import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Providers from "@/components/layout/Providers";

export const metadata = {
  title: "VehiclePart - India's Vehicle Spare Parts Marketplace",
  description: "Find genuine and compatible spare parts for cars, bikes, trucks, tractors and EVs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
