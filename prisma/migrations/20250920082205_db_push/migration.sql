/*
  Warnings:

  - You are about to drop the column `invoiceId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `razorpay_customers` table. All the data in the column will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[paymentNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contactId]` on the table `razorpay_customers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentNumber` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactId` to the `razorpay_customers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ContactType" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('GOODS', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."ComputationMethod" AS ENUM ('PERCENTAGE', 'FIXED_VALUE');

-- CreateEnum
CREATE TYPE "public"."ApplicableOn" AS ENUM ('SALES', 'PURCHASE', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EXPENSE', 'INCOME', 'EQUITY');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BillStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('RECEIVED', 'PAID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."InvoiceStatus" ADD VALUE 'PARTIALLY_PAID';
ALTER TYPE "public"."InvoiceStatus" ADD VALUE 'OVERDUE';

-- AlterEnum
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- DropForeignKey
ALTER TABLE "public"."invoices" DROP CONSTRAINT "invoices_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."invoices" DROP CONSTRAINT "invoices_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."razorpay_customers" DROP CONSTRAINT "razorpay_customers_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."razorpay_orders" DROP CONSTRAINT "razorpay_orders_invoiceId_fkey";

-- DropIndex
DROP INDEX "public"."payments_invoiceId_key";

-- DropIndex
DROP INDEX "public"."razorpay_customers_customerId_key";

-- DropIndex
DROP INDEX "public"."users_loginid_idx";

-- AlterTable
ALTER TABLE "public"."payments" DROP COLUMN "invoiceId",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "contactId" TEXT NOT NULL,
ADD COLUMN     "customerInvoiceId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paymentNumber" TEXT NOT NULL,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "type" "public"."PaymentType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vendorBillId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."razorpay_customers" DROP COLUMN "customerId",
ADD COLUMN     "contactId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."customers";

-- DropTable
DROP TABLE "public"."invoices";

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ContactType" NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "profileImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ProductType" NOT NULL,
    "salesPrice" DECIMAL(10,2) NOT NULL,
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "saleTaxRate" DECIMAL(5,2) NOT NULL,
    "purchaseTaxRate" DECIMAL(5,2) NOT NULL,
    "hsnCode" TEXT,
    "category" TEXT,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."taxes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "computationMethod" "public"."ComputationMethod" NOT NULL,
    "rate" DECIMAL(5,2),
    "fixedValue" DECIMAL(10,2),
    "applicableOn" "public"."ApplicableOn" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chart_of_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_bills" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "vendorId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "public"."BillStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "vendor_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_bill_items" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "vendor_bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_order_items" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "customerId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "receivedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_invoice_items" (
    "id" TEXT NOT NULL,
    "customerInvoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "customer_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "public"."contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "public"."chart_of_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "public"."purchase_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bills_billNumber_key" ON "public"."vendor_bills"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_orderNumber_key" ON "public"."sales_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_invoiceNumber_key" ON "public"."customer_invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "public"."payments"("paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_customers_contactId_key" ON "public"."razorpay_customers"("contactId");

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."taxes" ADD CONSTRAINT "taxes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_bills" ADD CONSTRAINT "vendor_bills_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_bills" ADD CONSTRAINT "vendor_bills_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_bills" ADD CONSTRAINT "vendor_bills_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_bill_items" ADD CONSTRAINT "vendor_bill_items_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "public"."vendor_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_bill_items" ADD CONSTRAINT "vendor_bill_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_order_items" ADD CONSTRAINT "sales_order_items_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "public"."sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_order_items" ADD CONSTRAINT "sales_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_invoices" ADD CONSTRAINT "customer_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_invoices" ADD CONSTRAINT "customer_invoices_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "public"."sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_invoices" ADD CONSTRAINT "customer_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_invoice_items" ADD CONSTRAINT "customer_invoice_items_customerInvoiceId_fkey" FOREIGN KEY ("customerInvoiceId") REFERENCES "public"."customer_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_invoice_items" ADD CONSTRAINT "customer_invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "public"."vendor_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_customerInvoiceId_fkey" FOREIGN KEY ("customerInvoiceId") REFERENCES "public"."customer_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."razorpay_customers" ADD CONSTRAINT "razorpay_customers_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."razorpay_orders" ADD CONSTRAINT "razorpay_orders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."customer_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
