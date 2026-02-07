<!--
Frontend → Backend Mapping (Mocks → Real API)

Services
- getServices (public) -> GET /api/public/services
  Transform: { nameFr -> name_fr, nameAr -> name_ar, descriptionFr -> description_fr, descriptionAr -> description_ar }
- getServices (admin) -> GET /api/admin/services
- createService -> POST /api/admin/services
- updateService -> PATCH /api/admin/services/:id
- deleteService -> DELETE /api/admin/services/:id

Doctors
- getDoctors (public) -> GET /api/public/doctors
- getDoctors (admin) -> GET /api/admin/doctors
- getDoctorsByService -> GET /api/public/doctors?serviceId=... (public) or filter client-side for admin list
- createDoctor -> POST /api/admin/doctors
- updateDoctor -> PATCH /api/admin/doctors/:id
- deleteDoctor -> DELETE /api/admin/doctors/:id
  Transform:
  - nameFr/nameAr -> name_fr/name_ar
  - titleFr/titleAr -> title_fr/title_ar
  - scheduleJson -> schedule
  - morningCapacity/eveningCapacity -> capacityMorning/capacityEvening

Appointments (public)
- listAvailableDoctors -> GET /api/public/availability?date=YYYY-MM-DD&slot=MORNING|EVENING&serviceId=...
  Transform slot: morning/evening <-> MORNING/EVENING
- createAppointment -> POST /api/appointments
  Body: { appointmentDate, slot, serviceId, doctorId, patientName, patientAge, patientPhone }
  Transform: appointmentDate (YYYY-MM-DD), slot uppercased
- getAppointmentTicket -> GET /api/appointments/:id

Appointments (admin)
- getAppointments -> GET /api/admin/appointments?date=YYYY-MM-DD&slot?&serviceId?&doctorId?&status?
- createAppointment -> POST /api/admin/appointments
- updateAppointment -> PATCH /api/admin/appointments/:id
- deleteAppointment -> DELETE /api/admin/appointments/:id
- updateAppointmentStatus -> PATCH /api/admin/appointments/:id (status only)

Display
- getDisplayState -> GET /api/display?since=ISO_TIMESTAMP
  Transform to DisplayData: { state=mode, queueNumber=shownQueueNumber, doctor/service names from payload }
- setDisplayState -> POST /api/admin/display (mode IDLE/OFF)

Waiting Room
- callNextForDoctor -> POST /api/admin/waiting-room/call-next
- callSpecificForDoctor -> POST /api/admin/waiting-room/call-specific

Stats
- getDashboardStats -> GET /api/admin/stats?date=YYYY-MM-DD
  Transform to DashboardStats shape

Videos
- listVideos (public) -> GET /api/videos (url -> src, sortOrder -> order)
- listVideos (admin) -> GET /api/admin/videos
- addVideo -> POST /api/admin/videos/upload (multipart/form-data)
- updateVideo -> PATCH /api/admin/videos/:id
- reorderVideos -> POST /api/admin/videos/reorder
- deleteVideo -> DELETE /api/admin/videos/:id

Auth
- adminLogin -> next-auth signIn("credentials")
- adminLogout -> next-auth signOut()
- isAdminLoggedIn -> useSession() / server session
-->
