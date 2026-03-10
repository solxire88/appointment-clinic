import type { SlotCapacity } from "../types"
import { getStore } from "../mock/data"

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function getSlotCapacity(): Promise<SlotCapacity> {
  await delay(100)
  return { ...getStore().slotCapacity }
}

export async function updateSlotCapacity(capacity: SlotCapacity): Promise<SlotCapacity> {
  await delay(200)
  const store = getStore()
  store.slotCapacity = { ...capacity }
  return { ...store.slotCapacity }
}
