/**
 * Puter.com Service Status Monitor
 * Helps track service availability and provides user feedback
 */

export interface ServiceStatus {
  available: boolean;
  lastChecked: Date;
  error?: string;
  responseTime?: number;
}

class PuterServiceMonitor {
  private status: ServiceStatus = {
    available: false,
    lastChecked: new Date()
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  /**
   * Start monitoring Puter.com service status
   */
  startMonitoring() {
    if (this.checkInterval) return;
    
    // Initial check
    this.checkServiceStatus();
    
    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkServiceStatus();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop monitoring service status
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check current service status
   */
  async checkServiceStatus(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Check if Puter is loaded and accessible
      if (!window.puter?.ai) {
        throw new Error('Puter.js not loaded');
      }

      // Try a simple AI call to test connectivity
      const testResponse = await window.puter.ai.chat('test', { 
        model: 'claude-sonnet-4-5' 
      });
      
      const responseTime = Date.now() - startTime;
      
      this.status = {
        available: true,
        lastChecked: new Date(),
        responseTime
      };
      
      console.log('Puter.com service status: Available', { responseTime });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.status = {
        available: false,
        lastChecked: new Date(),
        error: errorMessage,
        responseTime
      };
      
      console.warn('Puter.com service status: Unavailable', { 
        error: errorMessage, 
        responseTime 
      });
    }
    
    return this.status;
  }

  /**
   * Get current service status
   */
  getStatus(): ServiceStatus {
    return { ...this.status };
  }

  /**
   * Check if service is currently available
   */
  isAvailable(): boolean {
    return this.status.available;
  }
}

// Export singleton instance
export const puterMonitor = new PuterServiceMonitor();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  // Wait a bit for page to load before starting
  setTimeout(() => {
    puterMonitor.startMonitoring();
  }, 2000);
}
