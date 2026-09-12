import { ReactNode } from "react";
import Link from "next/link";
import { SocketConnectionStatus } from "@/components/ui/SocketConnectionStatus";

export default function CaptainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full flex flex-col bg-[#F8F9FA] font-sans overflow-hidden text-[#111111] selection:bg-[#FFD600] selection:text-black">
      <SocketConnectionStatus />
      {/* Top Navigation Chrome: Crisp High-Contrast White with Sub-border */}
      <header className="h-[64px] shrink-0 w-full z-50 bg-white/95 backdrop-blur-xl border-b border-[#E2E8F0] shadow-sm">
        <div className="h-full w-full px-margin-desktop flex items-center justify-between gap-gutter-desktop">
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-space-sm">
              <span className="font-extrabold text-xl text-[#111111] tracking-tight">TRIPZO</span>
            </div>
            <div className="hidden xl:flex items-center gap-space-xs px-3 py-1 rounded-full bg-[#F1F3F5] border border-slate-200">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">NEW DELHI · LIVE NETWORK</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 p-1 bg-[#F1F3F5] rounded-full border border-slate-200">
            <Link href="/rider" className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-black hover:bg-white transition-all">Book Ride</Link>
            <Link href="/rider" className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-black hover:bg-white transition-all">Live Tracking</Link>
            <Link href="/captain" className="px-4 py-1.5 text-xs font-bold transition-all bg-[#111111] text-[#FFD600] rounded-full shadow-sm" aria-current="page">Captain Console</Link>
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-black hover:bg-white transition-all">Ride History</button>
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-black hover:bg-white transition-all">Scheduled Trips</button>
          </nav>
          <div className="flex items-center gap-space-md">
            <button className="hidden lg:flex items-center gap-space-sm px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-slate-400 transition-all text-xs" type="button">
              <span className="material-symbols-outlined text-base">search</span>
              <span className="font-medium">Search coordinate...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">⌘K</kbd>
            </button>
            <div className="hidden sm:flex items-center gap-space-xs px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-800">SOCKET 99.98%</span>
            </div>
            <button aria-label="Notifications" className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all shadow-sm" type="button">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <div className="flex items-center gap-2 pl-1">
              <img alt="Captain Vikram" className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FFD600] shadow-sm" src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-[#111111] leading-tight">Capt. Vikram</span>
                <span className="text-[10px] text-slate-500 font-semibold">Tier-1 Elite Moto</span>
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
      <footer className="w-full bg-white border-t border-[#E2E8F0] py-space-xl shadow-sm shrink-0">
        <div className="w-full px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md text-slate-600">
          <div className="flex items-center gap-space-md">
            <span className="font-extrabold text-lg text-[#111111]">TRIPZO</span>
            <span className="text-xs font-medium text-slate-500">Autonomous Urban Mobility Operations Cockpit © 2025</span>
          </div>
          <div className="flex items-center gap-space-lg text-xs font-bold">
            <button className="text-slate-700 hover:text-black transition-colors">Telematics Protocol</button>
            <button className="text-slate-700 hover:text-black transition-colors">Fleet Operations</button>
            <button className="text-slate-700 hover:text-black transition-colors">Safety Dispatch</button>
            <button className="text-slate-700 hover:text-black transition-colors">System Status</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
