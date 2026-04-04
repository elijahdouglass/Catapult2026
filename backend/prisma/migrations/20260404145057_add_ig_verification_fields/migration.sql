-- AlterTable
ALTER TABLE `User` ADD COLUMN `igVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `igVerifyCode` VARCHAR(191) NULL;
