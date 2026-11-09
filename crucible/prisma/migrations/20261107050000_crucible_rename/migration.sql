UPDATE "User"
SET "email" = replace("email", '@gauntlet.local', '@crucible.local')
WHERE "email" LIKE '%@gauntlet.local'
  AND NOT EXISTS (
    SELECT 1 FROM "User" u2 WHERE u2."email" = replace("User"."email", '@gauntlet.local', '@crucible.local')
  );

ALTER TABLE "Workspace" ALTER COLUMN "imageTag" SET DEFAULT 'crucible/node:20';
UPDATE "Workspace" SET "imageTag" = replace("imageTag", 'gauntlet/', 'crucible/') WHERE "imageTag" LIKE 'gauntlet/%';
