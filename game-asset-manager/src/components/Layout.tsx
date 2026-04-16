import { NavLink, Outlet } from "react-router-dom";
import { Users, Map, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import soundforgeLogo from "@/assets/soundforge.png";

const navItems = [
  { to: "/sprites", icon: Users, label: "Characters" },
  { to: "/maps", icon: Map, label: "Maps" },
  { to: "/graph", icon: GitBranch, label: "Graph" },
];

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
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
  );
}
