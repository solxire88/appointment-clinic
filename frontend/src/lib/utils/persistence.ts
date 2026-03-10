import type { Doctor, Appointment } from "../types"

const STORAGE_KEYS = {
  DOCTORS: "clinic_doctors",
  APPOINTMENTS: "clinic_appointments",
} as const

/**
 * Persist doctors to localStorage. Called after any doctor update.
 */
export function persistDoctors(doctors: Doctor[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors))
    }
  } catch (err) {
    console.error("[v0] Failed to persist doctors:", err)
  }
}

/**
 * Load doctors from localStorage if available.
 */
export function loadDoctorsFromStorage(): Doctor[] | null {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.DOCTORS)
      return stored ? JSON.parse(stored) : null
    }
  } catch (err) {
    console.error("[v0] Failed to load doctors from storage:", err)
  }
  return null
}

/**
 * Clear doctors from localStorage.
 */
export function clearDoctorsStorage(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.DOCTORS)
    }
  } catch (err) {
    console.error("[v0] Failed to clear doctors storage:", err)
  }
}

/**
 * Persist appointments to localStorage. Called after any appointment change.
 */
export function persistAppointments(appointments: Appointment[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments))
    }
  } catch (err) {
    console.error("[v0] Failed to persist appointments:", err)
  }
}

/**
 * Load appointments from localStorage if available.
 */
export function loadAppointmentsFromStorage(): Appointment[] | null {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)
      return stored ? JSON.parse(stored) : null
    }
  } catch (err) {
    console.error("[v0] Failed to load appointments from storage:", err)
  }
  return null
}

/**
 * Clear appointments from localStorage.
 */
export function clearAppointmentsStorage(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS)
    }
  } catch (err) {
    console.error("[v0] Failed to clear appointments storage:", err)
  }
}
