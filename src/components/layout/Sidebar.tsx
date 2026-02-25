import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Calendar, 
  FlaskConical, 
  Map, 
  Settings,
  Flame,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getStreakData } from "@/lib/streaks";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/history", icon: Calendar, label: "History" },
  { to: "/products", icon: FlaskConical, label: "Products" },
  { to: "/journey", icon: Map, label: "Journey" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    getStreakData(user.id)
      .then((d) => setCurrentStreak(d.currentStreak))
      .catch(() => setCurrentStreak(0));
  }, [user?.id, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const streakLabel = currentStreak === null ? "—" : currentStreak === 1 ? "1 Day" : `${currentStreak} Days`;

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Clear<span className="text-primary">Day</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 hidden lg:block">Your skincare companion</p>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => isMobile && setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Streak Quick View */}
      <div className="p-3 lg:p-4 border-t border-border space-y-3">
        <div className="bg-accent/10 rounded-xl p-3 lg:p-4 flex items-center gap-3">
          <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-full bg-accent flex items-center justify-center">
            <Flame size={18} className="lg:w-5 lg:h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-display text-base lg:text-lg font-bold text-foreground">{streakLabel}</p>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut size={18} />
          <span>Log out</span>
        </Button>
      </div>
    </>
  );

  // Mobile hamburger
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-50">
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
            Clear<span className="text-primary">Day</span>
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
            <Menu size={22} />
          </Button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              
              {/* Drawer */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-screen w-72 bg-card border-r border-border flex flex-col z-50"
              >
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50"
    >
      <SidebarContent />
    </motion.aside>
  );
}
