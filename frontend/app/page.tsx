"use client"

import { TopBar } from "@/components/clinic/top-bar"
import { Header } from "@/components/clinic/header"
import { HeroSection } from "@/components/clinic/hero-section"
import { AboutSection } from "@/components/clinic/about-section"
import { ServicesSection } from "@/components/clinic/services-section"
import { DoctorsSection } from "@/components/clinic/doctors-section"
import { AppointmentForm } from "@/components/clinic/appointment-form"
import { ContactSection } from "@/components/clinic/contact-section"
import { Footer } from "@/components/clinic/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        <HeroSection />
        <div className="section-divider" />
        <AboutSection />
        <ServicesSection />
        <div className="section-divider" />
        <DoctorsSection />
        <div className="section-divider" />
        <AppointmentForm />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
