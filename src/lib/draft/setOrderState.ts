// In-memory state for the setorder UI flow.
// Maps sessionId, ordered array of captain Discord user IDs as the admin places them.
// Cleared when the admin confirms or when the session is cancelled.
interface PickOrderState {
  order: string[];
  isFinal: boolean;
}

const pendingPickOrders = new Map<string, { order: string[]; isFinal: boolean }>();

export function getPickOrder(sessionId: string): PickOrderState {
  return pendingPickOrders.get(sessionId) ?? { order: [], isFinal: false };
}

export function updatePickOrder(sessionId: string, order: string[]): void {
  pendingPickOrders.set(sessionId, { order, isFinal: false });
}

export function finalizePickOrder(sessionId: string): void {
  const current = pendingPickOrders.get(sessionId);
  if (current) {
    pendingPickOrders.set(sessionId, { order: current.order, isFinal: true });
  }
}

export function clearPickOrder(sessionId: string): void {
  pendingPickOrders.delete(sessionId);
}
