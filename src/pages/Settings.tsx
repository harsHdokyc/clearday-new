import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, Moon, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/ui/time-input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useNotifications } from "@/contexts/NotificationContext";

const settingGroups = [
  {
    title: "Account",
    items: [
      { icon: User, label: "Profile", description: "Edit your skin profile", action: "link" },
      { icon: Bell, label: "Notifications", description: "Reminder preferences", action: "link" },
      { icon: Shield, label: "Privacy", description: "Data and photo settings", action: "link" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Moon, label: "Dark Mode", description: "Toggle dark theme", action: "toggle", key: "darkMode" },
      { icon: Bell, label: "Daily Reminders", description: "Get notified to check in", action: "toggle", key: "dailyReminders" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help Center", description: "FAQs and guides", action: "link" },
    ],
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { logout, user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings: notificationSettings, updateSettings, requestPermission, permission } = useNotifications();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleToggle = async (item: any) => {
    if (item.key === "darkMode") {
      setTheme(theme === "dark" ? "light" : "dark");
    } else if (item.key === "dailyReminders") {
      const newValue = !notificationSettings.enabled;
      
      if (newValue) {
        // Request permission before enabling
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          // Show error message using toast or alert
          alert('Please enable browser notifications to use daily reminders.');
          return;
        }
      }
      
      updateSettings({ enabled: newValue });
    }
  };

  const handleTimeChange = (newTime: string) => {
    updateSettings({ time: newTime });
  };


  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your account and preferences
          </p>
        </motion.div>

        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 sm:p-6 shadow-soft mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4"
        >
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={24} className="sm:w-8 sm:h-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground truncate">
              {user?.name || "User"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {user?.email || "demo@email.com"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              Goal: <span className="text-foreground capitalize">{profile?.skin_goal || "Not set"}</span>
              {" • "}
              Type: <span className="text-foreground capitalize">{profile?.skin_type || "Not set"}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex">Edit</Button>
        </motion.div>

        {/* Settings Groups */}
        {settingGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + groupIndex * 0.1 }}
            className="mb-4 sm:mb-6"
          >
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3 px-1">
              {group.title}
            </h3>
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-soft overflow-hidden">
              {group.items.map((item, itemIndex) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    itemIndex !== group.items.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-muted flex items-center justify-center">
                    <item.icon size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base">{item.label}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                  {item.action === "toggle" ? (
                    <>
                      <Switch 
                        checked={
                          item.key === "darkMode" 
                            ? theme === "dark" 
                            : item.key === "dailyReminders" 
                              ? notificationSettings.enabled 
                              : (item as any).enabled
                        }
                        onCheckedChange={() => handleToggle(item)}
                      />
                      {item.key === "dailyReminders" && notificationSettings.enabled && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">at</span>
                          <TimeInput 
                            value={notificationSettings.time} 
                            onChange={handleTimeChange}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <ChevronRight size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full justify-center gap-2 h-11 sm:h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground"
        >
          <p>ClearDay v1.0.0</p>
          <p className="mt-1">Made with care for your skin</p>
        </motion.div>
      </div>
    </div>
  );
}
