-- CreateTable
CREATE TABLE "MysteryGame" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "players" INTEGER NOT NULL,
    "playTime" TEXT,
    "secretTalk" BOOLEAN NOT NULL DEFAULT false,
    "owner" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MysteryGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryPlay" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "visitId" TEXT,
    "playedOn" DATE NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "playersText" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MysteryPlay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MysteryGame_title_key" ON "MysteryGame"("title");

-- CreateIndex
CREATE INDEX "MysteryPlay_gameId_idx" ON "MysteryPlay"("gameId");

-- CreateIndex
CREATE INDEX "MysteryPlay_visitId_idx" ON "MysteryPlay"("visitId");

-- AddForeignKey
ALTER TABLE "MysteryPlay" ADD CONSTRAINT "MysteryPlay_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "MysteryGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryPlay" ADD CONSTRAINT "MysteryPlay_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryPlay" ADD CONSTRAINT "MysteryPlay_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 활동 태그 "머더미스터리" 추가 (이미 있으면 건너뜀)
INSERT INTO "Tag" ("id", "slug", "label", "emoji", "sortOrder", "active")
VALUES ('tag_murder_mystery', 'murder', '머더미스터리', '🔍', 9, true)
ON CONFLICT ("slug") DO NOTHING;
