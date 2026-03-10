import { jsPDF } from "jspdf"

interface TicketData {
  date: string
  slot: string
  service_fr: string
  service_ar: string
  doctor_fr?: string
  doctor_ar?: string
  patientName: string
  patientPhone: string
  locale: "fr" | "ar"
}

export async function generateTicketPDF(data: TicketData): Promise<void> {
  try {
    const pdf = new jsPDF("portrait", "mm", "a5")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 8
    const contentWidth = pageWidth - 2 * margin
    
    // Background
    pdf.setFillColor(245, 250, 248)
    pdf.rect(0, 0, pageWidth, pageHeight, "F")
    
    // Clinic branding
    pdf.setTextColor(20, 100, 80)
    pdf.setFontSize(16)
    pdf.setFont("helvetica", "bold")
    const clinicName = data.locale === "ar" ? "عيادة مرابط" : "Clinique Mrabeut"
    pdf.text(clinicName, margin, margin + 6, { maxWidth: contentWidth, align: data.locale === "ar" ? "right" : "left" })
    
    // Title
    pdf.setTextColor(10, 60, 50)
    pdf.setFontSize(20)
    pdf.setFont("helvetica", "bold")
    const ticketTitle = data.locale === "ar" ? "تأكيد الموعد" : "Confirmation de rendez-vous"
    pdf.text(ticketTitle, margin, margin + 18, { maxWidth: contentWidth, align: data.locale === "ar" ? "right" : "left" })
    
    // Divider
    pdf.setDrawColor(160, 200, 190)
    pdf.line(margin, margin + 25, pageWidth - margin, margin + 25)
    
    // Details
    pdf.setTextColor(60, 70, 80)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "normal")
    
    let y = margin + 31
    
    const addRow = (label: string, value: string) => {
      pdf.setFont("helvetica", "bold")
      pdf.text(label, margin, y, { maxWidth: contentWidth * 0.35 })
      pdf.setFont("helvetica", "normal")
      pdf.text(value, margin + contentWidth * 0.4, y, { maxWidth: contentWidth * 0.55, align: data.locale === "ar" ? "right" : "left" })
      y += 6
    }
    
    // Service
    const serviceName = data.locale === "ar" ? data.service_ar : data.service_fr
    addRow(data.locale === "ar" ? "الخدمة:" : "Service:", serviceName)
    
    // Doctor
    if (data.doctor_fr) {
      const docName = data.locale === "ar" ? (data.doctor_ar || data.doctor_fr) : data.doctor_fr
      addRow(data.locale === "ar" ? "الطبيب:" : "Médecin:", docName)
    }
    
    // Date
    const dateLabel = data.locale === "ar" ? "التاريخ:" : "Date:"
    addRow(dateLabel, data.date)
    
    // Time
    const timeLabel = data.locale === "ar" ? "الفترة:" : "Créneau:"
    addRow(timeLabel, data.slot)
    
    // Patient
    const patientLabel = data.locale === "ar" ? "المريض:" : "Patient:"
    addRow(patientLabel, data.patientName)
    
    // Phone
    const phoneLabel = data.locale === "ar" ? "الهاتف:" : "Téléphone:"
    addRow(phoneLabel, data.patientPhone)
    
    // Footer
    y += 4
    pdf.setFontSize(7)
    pdf.setTextColor(120, 130, 140)
    const footerText = data.locale === "ar" ? "الرجاء الحفاظ على هذه التذكرة للتحقق من الهوية" : "Conservez ce ticket pour vérification"
    pdf.text(footerText, margin, pageHeight - margin, { maxWidth: contentWidth, align: data.locale === "ar" ? "right" : "left" })
    
    // Download
    pdf.save(`ticket-rdv-${data.date}.pdf`)
  } catch (error) {
    console.error("[v0] Ticket PDF generation error:", error)
    throw new Error("Failed to generate ticket")
  }
}
