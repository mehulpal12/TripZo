"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { SocketConnectionStatus } from "@/components/ui/SocketConnectionStatus";
import { Bell, History, Compass, CalendarClock } from "lucide-react";
import { useCaptainStore } from "@/stores/captain.store";

export default function CaptainLayout({ children }: { children: ReactNode }) {
  const { activeTab, setActiveTab, isOnline } = useCaptainStore();

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8F9FA] font-sans text-[#111111] selection:bg-[#FFD600] selection:text-black">
      <SocketConnectionStatus />
      
      {/* Top Navigation Chrome */}
      <header className="h-[52px] shrink-0 w-full z-50 bg-[#111111] backdrop-blur-xl border-b border-slate-800 shadow-sm">
        <div className="h-full w-full px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none" 
              onClick={() => setActiveTab('cockpit')}
            >
              <span className="font-black text-xl text-white tracking-tight">TRIPZO</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FFD600] text-black tracking-widest uppercase">
                CAPTAIN
              </span>
            </div>
            
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-slate-300 tracking-wider">DELHI-NCR FLEET NETWORK</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-full border border-slate-800 shadow-inner">
            <button 
              onClick={() => setActiveTab('cockpit')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'cockpit'
                  ? 'bg-[#FFD600] text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Cockpit</span>
              {isOnline && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-[#FFD600] text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Scheduled Rides</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#FFD600] text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Ride History</span>
            </button>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              aria-label="Notifications" 
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all relative" 
              type="button"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FFD600]" />
            </button>

            <div className="flex items-center gap-2.5 pl-1">
              <img 
                alt="Captain Profile" 
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-[#FFD600] shadow-xs" 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
              />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">Capt. Vikram</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wide">Moto Elite Partner</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-[#F8F9FA]">
        {children}
      </main>

      {/* High-Contrast Clean Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-3.5 px-4 sm:px-8 shadow-xs shrink-0">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base text-[#111111] tracking-tight">TRIPZO</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="text-xs font-medium text-slate-500">Autonomous Urban Mobility Operations Cockpit © 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <span className="text-slate-400">Delhi NCR Region</span>
          </div>
        </div>
      </footer>
    </div>
  );
}