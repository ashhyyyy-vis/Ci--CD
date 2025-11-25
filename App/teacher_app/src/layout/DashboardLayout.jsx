import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import HeaderBar from "@/components/HeaderBar";
import FooterBar from "@/components/FooterBar";

export default function DashboardLayout({ children }) {
  const [open, setOpen] = useState(false);

  const toggleSidebar = () => setOpen(!open);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <Sidebar isOpen={open} />

      {/* Main area */}
      <div
        className={`flex-1 transition-all duration-300 
          ${open ? "ml-64" : "ml-16"}`}
      >
        <HeaderBar toggleSidebar={toggleSidebar} />

        <main className="p-6">{children}</main>

        <FooterBar />
      </div>
    </div>
  );
}
