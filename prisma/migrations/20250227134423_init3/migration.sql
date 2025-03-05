/*
  Warnings:

  - You are about to drop the `Languages` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id]` on the table `Language` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `android_code` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `internal_code` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locale` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locale_with_underscore` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `osx_code` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `osx_locale` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `popularity` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `three_letters_code` to the `Language` table without a default value. This is not possible if the table is not empty.
  - Added the required column `two_letters_code` to the `Language` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Language" ADD COLUMN     "android_code" TEXT NOT NULL,
ADD COLUMN     "dialect_of" TEXT,
ADD COLUMN     "internal_code" TEXT NOT NULL,
ADD COLUMN     "language" TEXT NOT NULL,
ADD COLUMN     "locale" TEXT NOT NULL,
ADD COLUMN     "locale_with_underscore" TEXT NOT NULL,
ADD COLUMN     "organization_id" TEXT,
ADD COLUMN     "osx_code" TEXT NOT NULL,
ADD COLUMN     "osx_locale" TEXT NOT NULL,
ADD COLUMN     "plural_category_names" TEXT[],
ADD COLUMN     "popularity" TEXT NOT NULL,
ADD COLUMN     "three_letters_code" TEXT NOT NULL,
ADD COLUMN     "two_letters_code" TEXT NOT NULL;

-- DropTable
DROP TABLE "Languages";

-- CreateIndex
CREATE UNIQUE INDEX "Language_id_key" ON "Language"("id");
