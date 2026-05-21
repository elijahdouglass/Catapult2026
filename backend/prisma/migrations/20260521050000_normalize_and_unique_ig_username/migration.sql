-- Normalize existing IG handles before adding the unique index. Strip any
-- leading "@", trim whitespace, and lowercase so users that previously
-- claimed "Alice" and "alice" collapse to the same canonical form. The
-- unique-index creation below will surface any genuine duplicates as a
-- migration failure rather than silently letting them through.
--
-- Order mirrors runtime normalization in backend/src/routes/auth.ts
-- (`normalizeIgUsername`): outer trim, strip leading '@', inner trim,
-- then lowercase. The extra TRIM around the strip handles "@ alice" → "alice".
UPDATE `User`
SET `igUsername` = LOWER(TRIM(TRIM(LEADING '@' FROM TRIM(`igUsername`))))
WHERE `igUsername` IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_igUsername_key` ON `User`(`igUsername`);
