-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONSULTA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancialLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rowOrder" INTEGER NOT NULL,
    "rowLabel" TEXT NOT NULL,
    "groupKey" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isSubtotal" BOOLEAN NOT NULL DEFAULT false,
    "isTotal" BOOLEAN NOT NULL DEFAULT false,
    "level" INTEGER NOT NULL DEFAULT 0,
    "colI" REAL NOT NULL DEFAULT 0,
    "colII" REAL NOT NULL DEFAULT 0,
    "colIII" REAL NOT NULL DEFAULT 0,
    "colIV" REAL NOT NULL DEFAULT 0,
    "colV" REAL NOT NULL DEFAULT 0,
    "colVI" REAL NOT NULL DEFAULT 0,
    "colVII" REAL NOT NULL DEFAULT 0,
    "colVIII" REAL NOT NULL DEFAULT 0,
    "colIX" REAL NOT NULL DEFAULT 0,
    "colX" REAL NOT NULL DEFAULT 0,
    "colXI" REAL NOT NULL DEFAULT 0,
    "colXII" REAL NOT NULL DEFAULT 0,
    "colVIAdjusted" REAL,
    "colVINote" TEXT,
    "colIXAdjusted" REAL,
    "colIXNote" TEXT,
    "uploadId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialLine_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SigefesUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SigefesUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthRef" TEXT NOT NULL,
    "referenceDate" TEXT,
    "fileName" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SigefesUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubsetInput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "monthRef" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubsetInput_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SigefesUpload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SubsetInput_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SepInput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "monthRef" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SepInput_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SigefesUpload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SepInput_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PdfExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthRef" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PdfExport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
