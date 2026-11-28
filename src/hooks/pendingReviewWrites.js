const pendingInMemory = new Set();

export function pendingReviewWrite(scope, operation, id) {
  const key = 'sona:pending-write:' + JSON.stringify([scope, operation, id]);
  return {
    isPending() {
      if (pendingInMemory.has(key)) return true;
      try {
        return globalThis.sessionStorage?.getItem(key) === '1';
      } catch {
        return false;
      }
    },
    mark() {
      pendingInMemory.add(key);
      try {
        globalThis.sessionStorage?.setItem(key, '1');
      } catch {
        // The in-memory marker still protects navigation if storage is unavailable.
      }
    },
    clear() {
      pendingInMemory.delete(key);
      try {
        globalThis.sessionStorage?.removeItem(key);
      } catch {
        // A stale marker is safer than replaying an unconfirmed write.
      }
    },
  };
}
