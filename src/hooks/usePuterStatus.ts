/**
 * React hook for Puter.com service status
 * Provides real-time service availability to components
 */

import { useState, useEffect } from 'react';
import { puterMonitor, ServiceStatus } from '../lib/puter-status';

export interface UsePuterStatusReturn extends ServiceStatus {
  isChecking: boolean;
  retryCheck: () => Promise<void>;
}

export const usePuterStatus = (): UsePuterStatusReturn => {
  const [status, setStatus] = useState<ServiceStatus>(puterMonitor.getStatus());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Update status when monitor detects changes
    const interval = setInterval(() => {
      const currentStatus = puterMonitor.getStatus();
      setStatus(currentStatus);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const retryCheck = async () => {
    setIsChecking(true);
    try {
      const newStatus = await puterMonitor.checkServiceStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to check Puter status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return {
    ...status,
    isChecking,
    retryCheck
  };
};
