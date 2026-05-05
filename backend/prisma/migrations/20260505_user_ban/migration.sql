ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_banned" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "users_is_banned_idx" ON "users"("is_banned");
