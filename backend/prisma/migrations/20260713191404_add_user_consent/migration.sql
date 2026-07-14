-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentDocsVersion" TEXT,
ADD COLUMN     "personalDataConsentAt" TIMESTAMP(3),
ADD COLUMN     "privacyPolicyAcceptedAt" TIMESTAMP(3);
