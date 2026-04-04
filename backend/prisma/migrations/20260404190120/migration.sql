/*
  Warnings:

  - A unique constraint covering the columns `[worldIdNullifier]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `worldIdNullifier` VARCHAR(191) NULL,
    ADD COLUMN `worldIdVerified` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `User_worldIdNullifier_key` ON `User`(`worldIdNullifier`);
