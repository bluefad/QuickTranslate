-- AddForeignKey
ALTER TABLE "LanguageResource" ADD CONSTRAINT "LanguageResource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
