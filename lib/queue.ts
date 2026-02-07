import type { Prisma, Slot } from "@prisma/client";

export async function nextDoctorQueueNumber(
  tx: Prisma.TransactionClient,
  params: { appointmentDate: Date; doctorId: string; slot: Slot }
): Promise<number> {
  const counter = await tx.doctorQueueCounter.upsert({
    where: {
      appointmentDate_doctorId_slot: {
        appointmentDate: params.appointmentDate,
        doctorId: params.doctorId,
        slot: params.slot,
      },
    },
    update: {
      lastNumber: { increment: 1 },
    },
    create: {
      appointmentDate: params.appointmentDate,
      doctorId: params.doctorId,
      slot: params.slot,
      lastNumber: 1,
    },
  });

  return counter.lastNumber;
}

export async function nextDailyQueueNumber(
  tx: Prisma.TransactionClient,
  params: { appointmentDate: Date }
): Promise<number> {
  const counter = await tx.dailyQueueCounter.upsert({
    where: { appointmentDate: params.appointmentDate },
    update: { lastNumber: { increment: 1 } },
    create: { appointmentDate: params.appointmentDate, lastNumber: 1 },
  });

  return counter.lastNumber;
}
