import { useState } from "react";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Removed Header */}
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} />
        <main
          className={cn(
            "flex-1 transition-all duration-300",
            sidebarOpen ? "md:ml-64" : "ml-0"
          )}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
