/*
  Warnings:

  - You are about to alter the column `filename` on the `ClinicVideo` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - A unique constraint covering the columns `[appointmentDate,dailyQueueNumber]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Appointment` ADD COLUMN `dailyQueueNumber` INTEGER NULL;

-- AlterTable
ALTER TABLE `ClinicVideo` MODIFY `filename` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `DailyQueueCounter` (
    `id` VARCHAR(191) NOT NULL,
    `appointmentDate` DATETIME(3) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `DailyQueueCounter_appointmentDate_key`(`appointmentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Appointment_appointmentDate_dailyQueueNumber_key` ON `Appointment`(`appointmentDate`, `dailyQueueNumber`);
