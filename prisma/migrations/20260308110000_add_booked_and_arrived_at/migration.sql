-- AlterTable
ALTER TABLE `Appointment`
  MODIFY `status` ENUM('BOOKED', 'WAITING', 'CALLED', 'DONE', 'NO_SHOW') NOT NULL DEFAULT 'BOOKED',
  ADD COLUMN `arrivedAt` DATETIME(3) NULL;

-- Backfill current waiting patients so waiting order is stable
UPDATE `Appointment`
SET `arrivedAt` = `createdAt`
WHERE `status` = 'WAITING' AND `arrivedAt` IS NULL;
