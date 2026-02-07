import { CheckCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "reminder" | "achievement" | "progress";
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export function NotificationDropdown({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onClearAll 
}: NotificationDropdownProps) {
  const { toast } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (id: number) => {
    onMarkAsRead(id);
  };

  const handleClearAll = () => {
    onClearAll();
    toast({ title: "Notifications cleared" });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="bg-background/50 backdrop-blur h-9 w-9 sm:h-10 sm:w-10 relative"
          title="Notifications"
        >
          <Bell size={18} className="sm:w-5 sm:h-5" />
          {/* Notification Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-[var(--radius)]" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="text-xs h-7 px-2"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        {/* Notifications List */}
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                  !notification.read ? 'bg-muted/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${
                    notification.type === 'achievement' ? 'text-success' :
                    notification.type === 'reminder' ? 'text-warning' :
                    'text-primary'
                  }`}>
                    {notification.type === 'achievement' && <CheckCircle size={16} />}
                    {notification.type === 'reminder' && <Bell size={16} />}
                    {notification.type === 'progress' && <CheckCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-medium text-foreground truncate ${
                        !notification.read ? 'font-semibold' : ''
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-border bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="w-full text-xs"
            >
              Clear all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
