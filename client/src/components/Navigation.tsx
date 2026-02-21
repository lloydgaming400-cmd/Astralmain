import { Link, useLocation } from "wouter";
import { QrCode, Trophy, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/qr", label: "Connection", icon: QrCode },
    { href: "/leaderboard", label: "Rankings", icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-auto md:left-0 md:w-64 md:h-screen bg-background/80 backdrop-blur-lg border-t md:border-t-0 md:border-r border-white/10 p-4">
      <div className="flex md:flex-col items-center md:items-start justify-around md:justify-start h-full gap-2 md:gap-6">
        <div className="hidden md:flex items-center gap-3 px-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center shadow-lg shadow-primary/20">
            <MessageSquare className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            Astral Bot
          </h1>
        </div>

        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group md:w-full",
                isActive
                  ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(147,51,234,0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className={cn("hidden md:block font-medium", isActive && "text-glow")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        <div className="hidden md:block mt-auto px-4 pb-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/20">
            <h3 className="text-secondary font-display text-sm font-bold mb-1 gold-glow">System Status</h3>
            <p className="text-xs text-muted-foreground">Core Formation Active</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
