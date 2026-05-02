// In-memory state for the setorder UI flow.
// Maps sessionId, ordered array of captain Discord user IDs as the admin places them.
// Cleared when the admin confirms or when the session is cancelled.
const pendingSetOrders = new Map<string, string[]>();

export function getSetOrder(sessionId: string): string[] {
  return pendingSetOrders.get(sessionId) ?? [];
}

export function updateSetOrder(sessionId: string, order: string[]): void {
  pendingSetOrders.set(sessionId, order);
}

export function clearSetOrder(sessionId: string): void {
  pendingSetOrders.delete(sessionId);
}
