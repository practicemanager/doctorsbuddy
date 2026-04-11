import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, CalendarDays, Receipt, Megaphone,
  Sparkles, MessageSquare, Settings, LogOut, Smile, ChevronLeft, ChevronRight, ListOrdered, Package, IndianRupee, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/queue", label: "Queue", icon: ListOrdered },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/treatment-costing", label: "Treatment Costing", icon: IndianRupee },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/finance", label: "Finance", icon: TrendingUp },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/ai-generator", label: "AI Generator", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Smile className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-sidebar-primary-foreground">
              Dental Buddy
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(item => (
            <Link key={item.href} to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <button onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {navItems.find(i => i.href === pathname)?.label ?? "Dental Buddy"}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {profile?.full_name || "User"}
              </span>
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {(profile?.full_name || "U").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
