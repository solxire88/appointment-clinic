-- CreateTable
CREATE TABLE `Service` (
  `id` VARCHAR(191) NOT NULL,
  `nameFr` VARCHAR(191) NOT NULL,
  `nameAr` VARCHAR(191) NOT NULL,
  `descriptionFr` VARCHAR(191) NOT NULL,
  `descriptionAr` VARCHAR(191) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Doctor` (
  `id` VARCHAR(191) NOT NULL,
  `serviceId` VARCHAR(191) NOT NULL,
  `nameFr` VARCHAR(191) NOT NULL,
  `nameAr` VARCHAR(191) NOT NULL,
  `titleFr` VARCHAR(191) NOT NULL,
  `titleAr` VARCHAR(191) NOT NULL,
  `photoUrl` VARCHAR(191) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `scheduleJson` JSON NOT NULL,
  `morningCapacity` INT NOT NULL DEFAULT 0,
  `eveningCapacity` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `Doctor_serviceId_idx` (`serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Appointment` (
  `id` VARCHAR(191) NOT NULL,
  `appointmentDate` DATETIME(3) NOT NULL,
  `slot` ENUM('MORNING', 'EVENING') NOT NULL,
  `serviceId` VARCHAR(191) NOT NULL,
  `doctorId` VARCHAR(191) NOT NULL,
  `patientName` VARCHAR(191) NOT NULL,
  `patientAge` INT NOT NULL,
  `patientPhone` VARCHAR(191) NOT NULL,
  `status` ENUM('WAITING', 'CALLED', 'DONE', 'NO_SHOW') NOT NULL DEFAULT 'WAITING',
  `doctorQueueNumber` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `Appointment_appointmentDate_doctorId_slot_doctorQueueNumber_key` (`appointmentDate`, `doctorId`, `slot`, `doctorQueueNumber`),
  INDEX `Appointment_appointmentDate_slot_idx` (`appointmentDate`, `slot`),
  INDEX `Appointment_appointmentDate_doctorId_slot_status_idx` (`appointmentDate`, `doctorId`, `slot`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DoctorQueueCounter` (
  `id` VARCHAR(191) NOT NULL,
  `appointmentDate` DATETIME(3) NOT NULL,
  `doctorId` VARCHAR(191) NOT NULL,
  `slot` ENUM('MORNING', 'EVENING') NOT NULL,
  `lastNumber` INT NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `DoctorQueueCounter_appointmentDate_doctorId_slot_key` (`appointmentDate`, `doctorId`, `slot`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DisplayState` (
  `id` VARCHAR(191) NOT NULL,
  `mode` ENUM('IDLE', 'CALLING', 'OFF') NOT NULL DEFAULT 'IDLE',
  `appointmentId` VARCHAR(191) NULL,
  `doctorId` VARCHAR(191) NULL,
  `serviceId` VARCHAR(191) NULL,
  `shownQueueNumber` INT NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL DEFAULT 'ADMIN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `AdminUser_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClinicVideo` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `sizeBytes` INT NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `ClinicVideo_enabled_sortOrder_idx` (`enabled`, `sortOrder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Doctor` ADD CONSTRAINT `Doctor_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorQueueCounter` ADD CONSTRAINT `DoctorQueueCounter_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
