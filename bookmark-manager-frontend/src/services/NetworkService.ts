export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
}

export class NetworkService {
  private static listeners: ((status: NetworkStatus) => void)[] = [];

  static initialize() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleConnectionChange);
      window.addEventListener('offline', this.handleConnectionChange);
    }
  }

  static cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleConnectionChange);
      window.removeEventListener('offline', this.handleConnectionChange);
    }
  }

  private static handleConnectionChange = () => {
    const status = this.getNetworkStatus();
    this.listeners.forEach(listener => listener(status));
  }

  static getNetworkStatus(): NetworkStatus {
    if (typeof navigator === 'undefined') {
      return { isOnline: true };
    }

    return {
      isOnline: navigator.onLine,
      connectionType: this.getConnectionType()
    };
  }

  private static getConnectionType(): string {
    // @ts-ignore - connection property exists on navigator in some browsers
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      return connection.effectiveType || connection.type || 'unknown';
    }
    
    return 'unknown';
  }

  static addNetworkListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  static async testInternetConnection(timeout = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}