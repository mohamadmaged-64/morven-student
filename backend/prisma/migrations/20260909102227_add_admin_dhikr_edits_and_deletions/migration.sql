-- CreateTable
CREATE TABLE "dhikr_official_edits" (
    "id" TEXT NOT NULL,
    "official_dhikr_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "edited_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dhikr_official_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dhikr_official_deletions" (
    "id" TEXT NOT NULL,
    "official_dhikr_id" TEXT NOT NULL,
    "deleted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dhikr_official_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dhikr_official_edits_official_dhikr_id_key" ON "dhikr_official_edits"("official_dhikr_id");

-- CreateIndex
CREATE UNIQUE INDEX "dhikr_official_deletions_official_dhikr_id_key" ON "dhikr_official_deletions"("official_dhikr_id");
