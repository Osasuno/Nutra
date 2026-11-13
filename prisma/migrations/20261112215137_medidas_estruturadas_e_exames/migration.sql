-- AlterTable
ALTER TABLE "MealItem" ADD COLUMN     "measureQty" DOUBLE PRECISION,
ADD COLUMN     "measureUnit" TEXT,
ADD COLUMN     "measureUnitG" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ExamFile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "fileName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamFile_patientId_createdAt_idx" ON "ExamFile"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExamFile" ADD CONSTRAINT "ExamFile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

