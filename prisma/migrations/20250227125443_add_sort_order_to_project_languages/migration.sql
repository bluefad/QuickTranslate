-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceLanguageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Languages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "internal_code" TEXT NOT NULL,
    "two_letters_code" TEXT NOT NULL,
    "three_letters_code" TEXT NOT NULL,
    "popularity" TEXT NOT NULL,
    "dialect_of" TEXT,
    "organization_id" TEXT,
    "plural_category_names" TEXT[],
    "language" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "locale_with_underscore" TEXT NOT NULL,
    "android_code" TEXT NOT NULL,
    "osx_code" TEXT NOT NULL,
    "osx_locale" TEXT NOT NULL,

    CONSTRAINT "Languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLanguages" (
    "projectId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ProjectLanguages_pkey" PRIMARY KEY ("projectId","languageId")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageResource" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Languages_id_key" ON "Languages"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageResource_moduleId_languageId_key_key" ON "LanguageResource"("moduleId", "languageId", "key");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sourceLanguageId_fkey" FOREIGN KEY ("sourceLanguageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLanguages" ADD CONSTRAINT "ProjectLanguages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLanguages" ADD CONSTRAINT "ProjectLanguages_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageResource" ADD CONSTRAINT "LanguageResource_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
