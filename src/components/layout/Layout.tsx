import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SectionNav from "./SectionNav";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-20 min-w-0">
        <SectionNav />
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
