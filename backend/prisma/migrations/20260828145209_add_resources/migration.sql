-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('FILE', 'NOTE', 'LINK');

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_files" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_notes" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_links" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resources_owner_id_idx" ON "resources"("owner_id");

-- CreateIndex
CREATE INDEX "resource_files_resource_id_idx" ON "resource_files"("resource_id");

-- CreateIndex
CREATE INDEX "resource_notes_resource_id_idx" ON "resource_notes"("resource_id");

-- CreateIndex
CREATE INDEX "resource_links_resource_id_idx" ON "resource_links"("resource_id");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
