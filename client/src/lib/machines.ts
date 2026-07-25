import type { MachineRecord, OrderRecord } from '../data/seeds'
import type { WithDocId } from '../hooks/useCollection'

/** First idle washer, or null when every washer is busy / in maintenance. */
export function findFreeWasher(machines: Array<MachineRecord & WithDocId>) {
  return machines.find((machine) => machine.type === 'Washer' && machine.status === 'Available') ?? null
}

/** First idle dryer, or null when every dryer is busy / in maintenance. */
export function findFreeDryer(machines: Array<MachineRecord & WithDocId>) {
  return machines.find((machine) => machine.type === 'Dryer' && machine.status === 'Available') ?? null
}

/** Oldest job still waiting for a machine (Pending), excluding one id. */
export function oldestPending(
  orders: Array<OrderRecord & WithDocId>,
  excludeId?: string,
) {
  return (
    orders
      .filter((order) => order.status === 'Pending' && order.id !== excludeId)
      .sort(
        (a, b) =>
          Number((a as unknown as Record<string, unknown>).createdAt ?? 0) -
          Number((b as unknown as Record<string, unknown>).createdAt ?? 0),
      )[0] ?? null
  )
}
