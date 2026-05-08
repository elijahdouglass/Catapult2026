-- CreateTable
CREATE TABLE `SeenUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `viewerId` INTEGER NOT NULL,
    `seenId` INTEGER NOT NULL,
    `seenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeenUser_viewerId_idx`(`viewerId`),
    UNIQUE INDEX `SeenUser_viewerId_seenId_key`(`viewerId`, `seenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SeenUser` ADD CONSTRAINT `SeenUser_viewerId_fkey` FOREIGN KEY (`viewerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeenUser` ADD CONSTRAINT `SeenUser_seenId_fkey` FOREIGN KEY (`seenId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
