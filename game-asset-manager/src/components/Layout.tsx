import { NavLink, Outlet } from "react-router-dom";
import { Users, Map, GitBranch, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import soundforgeLogo from "@/assets/soundforge.png";

const navItems = [
  { to: "/sprites", icon: Users, label: "Characters" },
  { to: "/maps", icon: Map, label: "Maps" },
  { to: "/graph", icon: GitBranch, label: "Graph" },
];

function ShowcaseBanner() {
  return (
    <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2.5">
      <div className="flex items-center gap-3 max-w-5xl mx-auto">
        <div className="h-7 w-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
          <Info className="h-3.5 w-3.5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-amber-900 leading-tight">
            Thanks for checking out SoundForge.
          </p>
          <p className="text-[11px] text-amber-800/80 leading-snug mt-0.5">
            Generation is paused to manage costs. Existing audio is still playable.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Layout() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <ShowcaseBanner />
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-52 border-r border-border flex flex-col shrink-0 bg-background">
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border">
          <img src={soundforgeLogo} alt="SoundForge" className="h-7 w-7 object-contain shrink-0" />
          <span className="font-bold text-sm text-foreground tracking-tight">SoundForge</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.14em] px-2 py-2 mb-1">
            Assets
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground/40 font-medium">v0.1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-background">
        <Outlet />
      </main>
      </div>
    </div>
  );
}
