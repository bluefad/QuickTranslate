/*
  Warnings:

  - A unique constraint covering the columns `[identifier]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Project_identifier_key" ON "Project"("identifier");
