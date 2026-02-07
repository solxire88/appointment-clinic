export const CLINIC_TIME_ZONE = "Africa/Algiers"

export function getClinicDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function formatClinicDateFromIso(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return getClinicDateString(date)
}
