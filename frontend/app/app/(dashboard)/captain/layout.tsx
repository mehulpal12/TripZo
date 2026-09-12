import { ReactNode } from "react";
import Link from "next/link";
import { SocketConnectionStatus } from "@/components/ui/SocketConnectionStatus";
import { Search, Bell, Car, Navigation, Shield, History, Calendar } from "lucide-react";

export default function CaptainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full flex flex-col bg-[#F8F9FA] font-sans overflow-hidden text-[#111111] selection:bg-[#FFD600] selection:text-black">
      <SocketConnectionStatus />
      
      {/* Top Navigation Chrome */}
      <header className="h-[50px] shrink-0 w-full z-50 bg-black backdrop-blur-xl border-b border-slate-200 shadow-xs">
        <div className="h-full w-full px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-black text-xl text-[#111111] tracking-tight bg-gradient-to-r from-[#111111] to-slate-700 bg-clip-text text-transparent">TRIPZO</span>
            </div>
            
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-[11px] font-bold text-slate-700 tracking-wider">NEW DELHI · LIVE NETWORK</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100 rounded-full border border-slate-200 shadow-2xs">
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-black hover:bg-white transition-all">Ride History</button>
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-black hover:bg-white transition-all">Scheduled Trips</button>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
           

            <button aria-label="Notifications" className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs relative group" type="button">
              <Bell className="w-4 h-4 text-slate-600 group-hover:text-black transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FFD600]" />
            </button>

            <div className="flex items-center gap-3 pl-1">
              <img alt="Captain Vikram" className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#FFD600] shadow-xs" src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-[#111111] leading-tight">Capt. Vikram</span>
                <span className="text-[10px] text-slate-500 font-semibold tracking-wide">Tier-1 Elite Moto</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-hidden bg-[#F8F9FA]">
        {children}
      </main>

      {/* High-Contrast Clean Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-4 sm:px-8 shadow-xs shrink-0">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base text-[#111111] tracking-tight">TRIPZO</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="text-xs font-medium text-slate-500">Autonomous Urban Mobility Operations Cockpit © 2025</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button className="hover:text-black transition-colors">Mehul Pal</button>
          </div>
        </div>
      </footer>
    </div>
  );
}