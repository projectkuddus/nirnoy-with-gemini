/**
 * Simple in-memory cache for client-side data
 * For production, consider using Redis or a more robust caching solution
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const cache = new Cache();

// Clean up expired entries every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.clearExpired();
  }, 60 * 1000);
}

// Cache key generators
export const CacheKeys = {
  patient: (id: string) => `patient:${id}`,
  doctor: (id: string) => `doctor:${id}`,
  appointment: (id: string) => `appointment:${id}`,
  healthRecords: (patientId: string) => `health_records:${patientId}`,
  conversations: (userId: string) => `conversations:${userId}`,
  queue: (doctorId: string) => `queue:${doctorId}`,
  notifications: (userId: string) => `notifications:${userId}`,
};

