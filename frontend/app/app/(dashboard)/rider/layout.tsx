import { ReactNode } from "react";
import { User, Bell, Search, CircleDot } from "lucide-react";

export default function RiderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full flex flex-col bg-background font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-[72px] shrink-0 border-b border-border bg-card flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          {/* Logo & Network Status */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tighter text-primary">TRIPZO</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-foreground">NEW DELHI · LIVE NETWORK</span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-2 ml-8">
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">Book Ride</button>
            <button className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-lg shadow-[0_0_12px_rgba(255,208,0,0.3)]">Live Tracking</button>
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">Captain Console</button>
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">Ride History</button>
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">Scheduled Trips</button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative hidden lg:flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search coordinate..." 
              className="pl-9 pr-12 py-2 w-64 bg-muted/50 border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="absolute right-3 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground">⌘</kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground">K</kbd>
            </div>
          </div>

          {/* Socket Health */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E1FFEC] border border-[#67F4B7]">
            <CircleDot className="w-3 h-3 text-[#006E4B] animate-pulse" />
            <span className="text-xs font-bold text-[#006E4B]">SOCKET 99.98%</span>
          </div>

          {/* Actions */}
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50 border border-border hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
          </button>
          
          <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-border shadow-sm">
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-hidden">
        {children}
      </main>

      {/* Bottom Footer */}
      <footer className="h-10 shrink-0 border-t border-border bg-[#0f131c] flex items-center justify-between px-6 text-xs font-medium text-slate-400 z-50">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">TRIPZO</span>
          <span>Autonomous Urban Mobility Console © 2025</span>
        </div>
        <div className="flex gap-6">
          <button className="hover:text-white transition-colors">Telematics Protocol</button>
          <button className="hover:text-white transition-colors">Fleet Operations</button>
          <button className="hover:text-white transition-colors">Safety Dispatch</button>
          <button className="hover:text-white transition-colors">System Status</button>
        </div>
      </footer>
    </div>
  );
}
