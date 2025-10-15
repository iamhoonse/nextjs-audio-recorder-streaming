// SSE를 통한 진행 상황 관리
type ProgressListener = (data: any) => void;

class ProgressManager {
  private listeners: Map<string, Set<ProgressListener>> = new Map();

  subscribe(sessionId: string, listener: ProgressListener) {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);
    console.log(`Listener added for session ${sessionId}. Total: ${this.listeners.get(sessionId)!.size}`);
  }

  unsubscribe(sessionId: string, listener: ProgressListener) {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(sessionId);
      }
      console.log(`Listener removed for session ${sessionId}`);
    }
  }

  sendProgress(sessionId: string, data: any) {
    const listeners = this.listeners.get(sessionId);
    if (listeners && listeners.size > 0) {
      console.log(`Sending progress to ${listeners.size} listener(s) for session ${sessionId}:`, data.type);
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error sending progress:', error);
        }
      });
    } else {
      console.log(`No listeners for session ${sessionId}`);
    }
  }

  hasListeners(sessionId: string): boolean {
    return this.listeners.has(sessionId) && this.listeners.get(sessionId)!.size > 0;
  }
}

// 싱글톤 인스턴스
export const progressManager = new ProgressManager();
