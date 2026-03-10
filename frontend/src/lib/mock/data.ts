import type {
  Service,
  Doctor,
  Appointment,
  DisplayData,
  SlotCapacity,
  WeeklySchedule,
} from "../types"

const defaultSchedule: WeeklySchedule = {
  mon: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  tue: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  wed: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  thu: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  fri: { morning: false, evening: false, morningCapacity: 0, eveningCapacity: 0 },
  sat: { morning: true, evening: false, morningCapacity: 10, eveningCapacity: 0 },
  sun: { morning: false, evening: false, morningCapacity: 0, eveningCapacity: 0 },
}

const morningOnlySchedule: WeeklySchedule = {
  mon: { morning: true, evening: false, morningCapacity: 8, eveningCapacity: 0 },
  tue: { morning: true, evening: false, morningCapacity: 8, eveningCapacity: 0 },
  wed: { morning: true, evening: false, morningCapacity: 8, eveningCapacity: 0 },
  thu: { morning: true, evening: false, morningCapacity: 8, eveningCapacity: 0 },
  fri: { morning: false, evening: false, morningCapacity: 0, eveningCapacity: 0 },
  sat: { morning: true, evening: false, morningCapacity: 8, eveningCapacity: 0 },
  sun: { morning: false, evening: false, morningCapacity: 0, eveningCapacity: 0 },
}

export const mockServices: Service[] = [
  {
    id: "svc-1",
    name_fr: "Medecine Generale",
    name_ar: "\u0627\u0644\u0637\u0628 \u0627\u0644\u0639\u0627\u0645",
    description_fr: "Consultations generales, bilans de sante et suivi medical pour toute la famille.",
    description_ar: "\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0639\u0627\u0645\u0629 \u0648\u0641\u062D\u0648\u0635\u0627\u062A \u0635\u062D\u064A\u0629 \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u0637\u0628\u064A\u0629 \u0644\u062C\u0645\u064A\u0639 \u0623\u0641\u0631\u0627\u062F \u0627\u0644\u0639\u0627\u0626\u0644\u0629.",
    icon: "stethoscope",
  },
  {
    id: "svc-2",
    name_fr: "Cardiologie",
    name_ar: "\u0637\u0628 \u0627\u0644\u0642\u0644\u0628",
    description_fr: "Diagnostic et traitement des maladies cardiovasculaires avec des equipements de pointe.",
    description_ar: "\u062A\u0634\u062E\u064A\u0635 \u0648\u0639\u0644\u0627\u062C \u0623\u0645\u0631\u0627\u0636 \u0627\u0644\u0642\u0644\u0628 \u0648\u0627\u0644\u0623\u0648\u0639\u064A\u0629 \u0627\u0644\u062F\u0645\u0648\u064A\u0629 \u0628\u0623\u062D\u062F\u062B \u0627\u0644\u0645\u0639\u062F\u0627\u062A.",
    icon: "heart-pulse",
  },
  {
    id: "svc-3",
    name_fr: "Pediatrie",
    name_ar: "\u0637\u0628 \u0627\u0644\u0623\u0637\u0641\u0627\u0644",
    description_fr: "Soins specialises pour les nourrissons, enfants et adolescents.",
    description_ar: "\u0631\u0639\u0627\u064A\u0629 \u0645\u062A\u062E\u0635\u0635\u0629 \u0644\u0644\u0631\u0636\u0639 \u0648\u0627\u0644\u0623\u0637\u0641\u0627\u0644 \u0648\u0627\u0644\u0645\u0631\u0627\u0647\u0642\u064A\u0646.",
    icon: "baby",
  },
  {
    id: "svc-4",
    name_fr: "Dermatologie",
    name_ar: "\u0637\u0628 \u0627\u0644\u062C\u0644\u062F",
    description_fr: "Traitement des affections cutanees et soins esthetiques de la peau.",
    description_ar: "\u0639\u0644\u0627\u062C \u0627\u0644\u0623\u0645\u0631\u0627\u0636 \u0627\u0644\u062C\u0644\u062F\u064A\u0629 \u0648\u0627\u0644\u0639\u0646\u0627\u064A\u0629 \u0627\u0644\u062A\u062C\u0645\u064A\u0644\u064A\u0629 \u0644\u0644\u0628\u0634\u0631\u0629.",
    icon: "scan-face",
  },
  {
    id: "svc-5",
    name_fr: "Gynecologie",
    name_ar: "\u0637\u0628 \u0627\u0644\u0646\u0633\u0627\u0621",
    description_fr: "Suivi gynecologique, grossesse et sante reproductive de la femme.",
    description_ar: "\u0645\u062A\u0627\u0628\u0639\u0629 \u0635\u062D\u0629 \u0627\u0644\u0645\u0631\u0623\u0629 \u0648\u0627\u0644\u062D\u0645\u0644 \u0648\u0627\u0644\u0635\u062D\u0629 \u0627\u0644\u0625\u0646\u062C\u0627\u0628\u064A\u0629.",
    icon: "heart",
  },
  {
    id: "svc-6",
    name_fr: "Ophtalmologie",
    name_ar: "\u0637\u0628 \u0627\u0644\u0639\u064A\u0648\u0646",
    description_fr: "Examens de la vue, correction visuelle et chirurgie ophtalmologique.",
    description_ar: "\u0641\u062D\u0635 \u0627\u0644\u0646\u0638\u0631 \u0648\u0627\u0644\u062A\u0635\u062D\u064A\u062D \u0627\u0644\u0628\u0635\u0631\u064A \u0648\u062C\u0631\u0627\u062D\u0629 \u0627\u0644\u0639\u064A\u0648\u0646.",
    icon: "eye",
  },
]

export const mockDoctors: Doctor[] = [
  { id: "doc-1", name_fr: "Dr. Amine Bouzid", name_ar: "\u062F. \u0623\u0645\u064A\u0646 \u0628\u0648\u0632\u064A\u062F", title_fr: "Medecin Generaliste", title_ar: "\u0637\u0628\u064A\u0628 \u0639\u0627\u0645", serviceId: "svc-1", photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face", schedule: { ...defaultSchedule }, capacityMorning: 10, capacityEvening: 8 },
  { id: "doc-2", name_fr: "Dr. Fatima Rahmani", name_ar: "\u062F. \u0641\u0627\u0637\u0645\u0629 \u0631\u062D\u0645\u0627\u0646\u064A", title_fr: "Medecin Generaliste", title_ar: "\u0637\u0628\u064A\u0628\u0629 \u0639\u0627\u0645\u0629", serviceId: "svc-1", photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face", schedule: { ...defaultSchedule, sat: { morning: true, evening: true, morningCapacity: 8, eveningCapacity: 6 } }, capacityMorning: 8, capacityEvening: 6 },
  { id: "doc-3", name_fr: "Dr. Karim Hadj", name_ar: "\u062F. \u0643\u0631\u064A\u0645 \u062D\u0627\u062C", title_fr: "Cardiologue", title_ar: "\u0637\u0628\u064A\u0628 \u0642\u0644\u0628", serviceId: "svc-2", photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face", schedule: { ...morningOnlySchedule }, capacityMorning: 6, capacityEvening: 0 },
  { id: "doc-4", name_fr: "Dr. Salima Khelifi", name_ar: "\u062F. \u0633\u0644\u064A\u0645\u0629 \u062E\u0644\u064A\u0641\u064A", title_fr: "Pediatre", title_ar: "\u0637\u0628\u064A\u0628\u0629 \u0623\u0637\u0641\u0627\u0644", serviceId: "svc-3", photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=200&h=200&fit=crop&crop=face", schedule: { ...defaultSchedule }, capacityMorning: 10, capacityEvening: 8 },
  { id: "doc-5", name_fr: "Dr. Yacine Mebarki", name_ar: "\u062F. \u064A\u0627\u0633\u064A\u0646 \u0645\u0628\u0627\u0631\u0643\u064A", title_fr: "Pediatre", title_ar: "\u0637\u0628\u064A\u0628 \u0623\u0637\u0641\u0627\u0644", serviceId: "svc-3", schedule: { ...defaultSchedule, sat: { morning: false, evening: false, morningCapacity: 0, eveningCapacity: 0 } }, capacityMorning: 8, capacityEvening: 6 },
  { id: "doc-6", name_fr: "Dr. Nadia Belkacem", name_ar: "\u062F. \u0646\u0627\u062F\u064A\u0629 \u0628\u0644\u0642\u0627\u0633\u0645", title_fr: "Dermatologue", title_ar: "\u0637\u0628\u064A\u0628\u0629 \u062C\u0644\u062F", serviceId: "svc-4", photoUrl: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=200&h=200&fit=crop&crop=face", schedule: { ...defaultSchedule }, capacityMorning: 8, capacityEvening: 6 },
  { id: "doc-7", name_fr: "Dr. Leila Amrani", name_ar: "\u062F. \u0644\u064A\u0644\u0649 \u0639\u0645\u0631\u0627\u0646\u064A", title_fr: "Gynecologue", title_ar: "\u0637\u0628\u064A\u0628\u0629 \u0646\u0633\u0627\u0621", serviceId: "svc-5", schedule: { ...morningOnlySchedule, sat: { morning: true, evening: false, morningCapacity: 6, eveningCapacity: 0 } }, capacityMorning: 6, capacityEvening: 0 },
  { id: "doc-8", name_fr: "Dr. Mourad Ziane", name_ar: "\u062F. \u0645\u0631\u0627\u062F \u0632\u064A\u0627\u0646", title_fr: "Ophtalmologue", title_ar: "\u0637\u0628\u064A\u0628 \u0639\u064A\u0648\u0646", serviceId: "svc-6", photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face", schedule: { ...defaultSchedule }, capacityMorning: 8, capacityEvening: 6 },
]

const today = new Date().toISOString().split("T")[0]

export const mockAppointments: Appointment[] = [
  { id: "apt-1", date: today, slot: "morning", serviceId: "svc-1", doctorId: "doc-1", patientName: "Ahmed Benali", patientAge: 34, patientPhone: "0555123456", status: "WAITING", queueNumber: 1, createdAt: new Date().toISOString() },
  { id: "apt-2", date: today, slot: "morning", serviceId: "svc-2", doctorId: "doc-3", patientName: "Sara Mouloud", patientAge: 28, patientPhone: "0661789012", status: "WAITING", queueNumber: 2, createdAt: new Date().toISOString() },
  { id: "apt-3", date: today, slot: "morning", serviceId: "svc-3", doctorId: "doc-4", patientName: "Mohamed Boudiaf", patientAge: 5, patientPhone: "0770345678", status: "DONE", queueNumber: 3, createdAt: new Date().toISOString() },
  { id: "apt-4", date: today, slot: "evening", serviceId: "svc-1", doctorId: "doc-2", patientName: "Amina Saidi", patientAge: 45, patientPhone: "0555987654", status: "WAITING", queueNumber: 4, createdAt: new Date().toISOString() },
  { id: "apt-5", date: today, slot: "evening", serviceId: "svc-4", doctorId: "doc-6", patientName: "Rachid Hamdi", patientAge: 52, patientPhone: "0661234567", status: "WAITING", queueNumber: 5, createdAt: new Date().toISOString() },
  { id: "apt-6", date: today, slot: "morning", serviceId: "svc-1", doctorId: "doc-1", patientName: "Youssef Tabet", patientAge: 29, patientPhone: "0555111222", status: "WAITING", queueNumber: 6, createdAt: new Date().toISOString() },
  { id: "apt-7", date: today, slot: "morning", serviceId: "svc-3", doctorId: "doc-4", patientName: "Nour Belhadj", patientAge: 3, patientPhone: "0770999888", status: "WAITING", queueNumber: 7, createdAt: new Date().toISOString() },
]

export const mockDisplayData: DisplayData = {
  state: "IDLE",
  updatedAt: new Date().toISOString(),
}

export const mockSlotCapacity: SlotCapacity = {
  morning: 20,
  evening: 15,
}

// Mutable store for runtime modifications
let _services = [...mockServices]
let _doctors = [...mockDoctors]
let _appointments = [...mockAppointments]
let _displayData = { ...mockDisplayData }
let _slotCapacity = { ...mockSlotCapacity }
let _nextQueueNumber = 8

export function getStore() {
  return {
    get services() { return _services },
    set services(v) { _services = v },
    get doctors() { return _doctors },
    set doctors(v) { _doctors = v },
    get appointments() { return _appointments },
    set appointments(v) { _appointments = v },
    get displayData() { return _displayData },
    set displayData(v) { _displayData = v },
    get slotCapacity() { return _slotCapacity },
    set slotCapacity(v) { _slotCapacity = v },
    getNextQueueNumber() { return _nextQueueNumber++ },
  }
}
