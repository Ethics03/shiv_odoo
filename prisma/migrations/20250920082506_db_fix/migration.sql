/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."chart_of_accounts" DROP CONSTRAINT "chart_of_accounts_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."contacts" DROP CONSTRAINT "contacts_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."customer_invoices" DROP CONSTRAINT "customer_invoices_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchase_orders" DROP CONSTRAINT "purchase_orders_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."sales_orders" DROP CONSTRAINT "sales_orders_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."taxes" DROP CONSTRAINT "taxes_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."vendor_bills" DROP CONSTRAINT "vendor_bills_createdById_fkey";

-- DropTable
DROP TABLE "public"."users";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loginid" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CONTACT_USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginid_key" ON "public"."User"("loginid");

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."taxes" ADD CONSTRAINT "taxes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_bills" ADD CONSTRAINT "vendor_bills_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_invoices" ADD CONSTRAINT "customer_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
