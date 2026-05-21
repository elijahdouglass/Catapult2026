-- AlterTable
ALTER TABLE `User` ADD COLUMN `clerkId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_clerkId_key` ON `User`(`clerkId`);
