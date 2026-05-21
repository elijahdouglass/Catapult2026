-- Adds a shadow column tracking the displayName value we last derived from
-- Clerk. The Clerk webhook compares the live displayName against this column
-- to decide whether to refresh: when they match, displayName is still the
-- Clerk-derived value and we refresh both; when they diverge, a user has
-- overridden their name via PATCH /auth/profile and we leave displayName
-- alone (but still update derivedDisplayName so we keep tracking Clerk).
--
-- Backfill seeds derivedDisplayName = displayName for existing rows. We have
-- no history of who has PATCHed their name, so this conservatively treats
-- existing rows as un-overridden — the first user.updated event after deploy
-- will re-sync from Clerk. Users who want to keep a custom display name can
-- re-PATCH it afterwards.
ALTER TABLE `User` ADD COLUMN `derivedDisplayName` VARCHAR(191) NULL;

UPDATE `User` SET `derivedDisplayName` = `displayName` WHERE `derivedDisplayName` IS NULL;
