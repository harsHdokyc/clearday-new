/**
 * Service Status Alert Component
 * Shows Puter.com service status to users when there are issues
 */

import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePuterStatus } from '@/hooks/usePuterStatus';

interface ServiceStatusAlertProps {
  showOnlyWhenDown?: boolean;
  className?: string;
}

export const ServiceStatusAlert = ({ 
  showOnlyWhenDown = true, 
  className = '' 
}: ServiceStatusAlertProps) => {
  const { available, error, lastChecked, isChecking, retryCheck } = usePuterStatus();

  // Don't show if service is available and showOnlyWhenDown is true
  if (available && showOnlyWhenDown) {
    return null;
  }

  const getStatusIcon = () => {
    if (available) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (available) {
      return 'AI services are online and working normally.';
    }
    return `AI services are currently unavailable. ${error || 'Please try again later.'}`;
  };

  const getTimeSinceLastCheck = () => {
    const now = new Date();
    const diff = now.getTime() - lastChecked.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  return (
    <Alert className={`${className} ${available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-start space-x-2">
        {getStatusIcon()}
        <div className="flex-1">
          <AlertDescription className="text-sm">
            <div className="flex items-center justify-between">
              <span>{getStatusText()}</span>
              <span className="text-xs text-muted-foreground ml-2">
                Last checked: {getTimeSinceLastCheck()}
              </span>
            </div>
            
            {!available && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retryCheck()}
                  disabled={isChecking}
                  className="text-xs"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Connection
                    </>
                  )}
                </Button>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};
