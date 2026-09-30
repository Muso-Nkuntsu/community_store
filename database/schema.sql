-- =============================================================================
-- Community Store Platform - MySQL 8 schema
-- =============================================================================
-- Mirrors prisma/schema.prisma. Use this file when a team member needs to
-- create the database by hand (MySQL Workbench, phpMyAdmin or the mysql CLI).
--
--   mysql -u root -p < database/schema.sql
--
-- If you create the tables with this script, do NOT then run
-- `npx prisma migrate dev` against the same database (Prisma would see tables
-- it didn't create and ask to reset). Instead run:
--
--   npx prisma generate      # build the client
--   npx prisma db seed       # optional demo data
--
-- The normal route (recommended) is to let Prisma create everything:
--   npx prisma migrate dev --name init
-- =============================================================================

CREATE DATABASE IF NOT EXISTS community_store
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE community_store;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `wishlist_items`;
DROP TABLE IF EXISTS `listings`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`                 VARCHAR(191) NOT NULL,
  `name`               VARCHAR(100) NOT NULL,
  `email`              VARCHAR(255) NOT NULL,
  `studentId`          VARCHAR(20)  NULL,
  `phone`              VARCHAR(20)  NULL,
  `passwordHash`       VARCHAR(255) NOT NULL,
  `role`               ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  `isActive`           BOOLEAN      NOT NULL DEFAULT true,
  `deactivatedAt`      DATETIME(3)  NULL,
  `deactivatedById`    VARCHAR(191) NULL,
  `deactivationReason` VARCHAR(500) NULL,
  `deletedAt`          DATETIME(3)  NULL,
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL,

  UNIQUE INDEX `users_email_key` (`email`),
  UNIQUE INDEX `users_studentId_key` (`studentId`),
  INDEX `users_role_idx` (`role`),
  INDEX `users_isActive_idx` (`isActive`),
  INDEX `users_deactivatedById_idx` (`deactivatedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- listings
-- -----------------------------------------------------------------------------
CREATE TABLE `listings` (
  `id`            VARCHAR(191)   NOT NULL,
  `title`         VARCHAR(120)   NOT NULL,
  `description`   TEXT           NOT NULL,
  `price`         DECIMAL(10, 2) NOT NULL,
  `category`      ENUM('TEXTBOOKS', 'ELECTRONICS', 'SERVICES', 'CLOTHING', 'FURNITURE', 'OTHER') NOT NULL,
  `imageUrl`      VARCHAR(2048)  NULL,
  `status`        ENUM('ACTIVE', 'SOLD', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
  `sellerId`      VARCHAR(191)   NOT NULL,
  `soldAt`        DATETIME(3)    NULL,
  `removedAt`     DATETIME(3)    NULL,
  `removedById`   VARCHAR(191)   NULL,
  `removalReason` VARCHAR(500)   NULL,
  `deletedAt`     DATETIME(3)    NULL,
  `createdAt`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)    NOT NULL,

  INDEX `listings_status_deletedAt_createdAt_idx` (`status`, `deletedAt`, `createdAt`),
  INDEX `listings_category_status_createdAt_idx` (`category`, `status`, `createdAt`),
  INDEX `listings_sellerId_status_idx` (`sellerId`, `status`),
  INDEX `listings_title_idx` (`title`),
  INDEX `listings_removedById_idx` (`removedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- wishlist_items
-- -----------------------------------------------------------------------------
CREATE TABLE `wishlist_items` (
  `id`        VARCHAR(191) NOT NULL,
  `userId`    VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `wishlist_items_userId_listingId_key` (`userId`, `listingId`),
  INDEX `wishlist_items_listingId_idx` (`listingId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- reports
-- -----------------------------------------------------------------------------
CREATE TABLE `reports` (
  `id`             VARCHAR(191)  NOT NULL,
  `listingId`      VARCHAR(191)  NOT NULL,
  `reporterId`     VARCHAR(191)  NOT NULL,
  `reason`         ENUM('FRAUD', 'INAPPROPRIATE', 'INCORRECT_INFO', 'SPAM', 'OTHER') NOT NULL,
  `details`        VARCHAR(1000) NULL,
  `status`         ENUM('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN') NOT NULL DEFAULT 'PENDING',
  `resolutionNote` VARCHAR(1000) NULL,
  `resolvedAt`     DATETIME(3)   NULL,
  `resolvedById`   VARCHAR(191)  NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)   NOT NULL,

  INDEX `reports_status_createdAt_idx` (`status`, `createdAt`),
  INDEX `reports_listingId_reporterId_status_idx` (`listingId`, `reporterId`, `status`),
  INDEX `reports_reporterId_idx` (`reporterId`),
  INDEX `reports_resolvedById_idx` (`resolvedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- sessions
-- -----------------------------------------------------------------------------
CREATE TABLE `sessions` (
  `id`             VARCHAR(191) NOT NULL,
  `tokenHash`      CHAR(64)     NOT NULL,
  `userId`         VARCHAR(191) NOT NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastActivityAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt`      DATETIME(3)  NOT NULL,
  `userAgent`      VARCHAR(255) NULL,
  `ipAddress`      VARCHAR(45)  NULL,

  UNIQUE INDEX `sessions_tokenHash_key` (`tokenHash`),
  INDEX `sessions_userId_idx` (`userId`),
  INDEX `sessions_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Foreign keys
-- -----------------------------------------------------------------------------
ALTER TABLE `users`
  ADD CONSTRAINT `users_deactivatedById_fkey`
  FOREIGN KEY (`deactivatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `listings`
  ADD CONSTRAINT `listings_sellerId_fkey`
  FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `listings`
  ADD CONSTRAINT `listings_removedById_fkey`
  FOREIGN KEY (`removedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `wishlist_items`
  ADD CONSTRAINT `wishlist_items_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wishlist_items`
  ADD CONSTRAINT `wishlist_items_listingId_fkey`
  FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `reports`
  ADD CONSTRAINT `reports_listingId_fkey`
  FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reports`
  ADD CONSTRAINT `reports_reporterId_fkey`
  FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reports`
  ADD CONSTRAINT `reports_resolvedById_fkey`
  FOREIGN KEY (`resolvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- Seed data
-- =============================================================================
-- Demo users need bcrypt password hashes, which are generated by the Prisma
-- seed script rather than hard-coded here. After creating the tables run:
--
--   npx prisma generate
--   npx prisma db seed
--
-- See README.md > "Seed data" for the development-only login credentials.
-- =============================================================================

-- Optional: a dedicated application user instead of connecting as root.
-- CREATE USER IF NOT EXISTS 'community_store_app'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
-- GRANT ALL PRIVILEGES ON community_store.* TO 'community_store_app'@'localhost';
-- FLUSH PRIVILEGES;
