# 🏢 TriNetra ERP System

[![YouTube Demo](https://img.shields.io/badge/YouTube-Demo-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=RFZ_9XQMKsw)

A comprehensive Enterprise Resource Planning (ERP) system built with **NestJS** and **PostgreSQL**, designed specifically for furniture businesses. This system provides end-to-end business management capabilities including inventory, sales, purchases, payments, and financial reporting.

## 🚀 Features Overview

### 📋 **Core Modules**

#### 👥 **Contact Management**
- **Customer & Vendor Management**: Complete contact database with detailed information
- **Contact Types**: Support for CUSTOMER, VENDOR, or BOTH classifications
- **Advanced Filtering**: Search by name, email, mobile, city, state
- **Profile Management**: Store addresses, contact details, and profile images
- **Razorpay Integration**: Automatic customer creation for payment processing

#### 📦 **Product Management**
- **Product Catalog**: Comprehensive product database with goods and services
- **Pricing Management**: Separate sales and purchase pricing
- **Tax Configuration**: Individual tax rates for sales and purchases
- **Inventory Tracking**: Real-time stock level monitoring
- **HSN Code Support**: Tax compliance with HSN/SAC codes
- **Category Management**: Organize products by categories

#### 💰 **Sales Management**
- **Sales Orders**: Create and manage customer orders
- **Invoice Generation**: Convert sales orders to professional invoices
- **Order Status Tracking**: DRAFT → CONFIRMED → COMPLETED → CANCELLED
- **Tax Calculations**: Automatic tax computation on line items
- **Customer Integration**: Seamless customer data integration

#### 🛒 **Purchase Management**
- **Purchase Orders**: Create and track vendor orders
- **Vendor Bills**: Convert purchase orders to bills
- **Bill Status Tracking**: UNPAID → PARTIALLY_PAID → PAID → OVERDUE
- **Vendor Integration**: Complete vendor management system
- **Order-to-Bill Workflow**: Streamlined procurement process

#### 💳 **Payment Processing**
- **Multi-Payment Methods**: Cash, Razorpay, Bank Transfer
- **Payment Types**: Received (from customers) and Paid (to vendors)
- **Outstanding Tracking**: Monitor unpaid bills and invoices
- **Payment History**: Complete payment audit trail
- **Razorpay Integration**: Secure online payment processing

#### 📊 **Financial Management**
- **Chart of Accounts**: Complete accounting structure
- **Account Types**: Assets, Liabilities, Expenses, Income, Equity
- **Hierarchical Structure**: Parent-child account relationships
- **Balance Tracking**: Real-time account balance monitoring
- **Balance Sheet Validation**: Ensure accounting equation balance

#### 📈 **Reporting & Analytics**
- **PDF Report Generation**: Professional business reports
- **Invoice PDFs**: Branded customer invoices
- **Purchase Order PDFs**: Vendor purchase orders
- **Profit & Loss Reports**: Comprehensive P&L statements
- **Balance Sheet Reports**: Financial position reports
- **Date Range Filtering**: Customizable report periods

#### 🔐 **Authentication & Authorization**
- **Role-Based Access**: ADMIN, INVOICING_USER, CONTACT_USER roles
- **Supabase Integration**: Secure authentication system
- **API Security**: Protected endpoints with role-based permissions
- **User Management**: Complete user profile management

### 🛠 **Technical Features**

#### 🏗 **Architecture**
- **NestJS Framework**: Scalable, modular Node.js framework
- **PostgreSQL Database**: Robust relational database with Prisma ORM
- **TypeScript**: Type-safe development environment
- **Modular Design**: Clean separation of concerns

#### 🔌 **Integrations**
- **Razorpay Payment Gateway**: Secure online payment processing
- **PDF Generation**: Professional document creation with PDFKit
- **Swagger Documentation**: Interactive API documentation
- **CORS Support**: Cross-origin resource sharing enabled

#### 📱 **API Features**
- **RESTful APIs**: Well-structured REST endpoints
- **Data Validation**: Comprehensive input validation with class-validator
- **Error Handling**: Robust error handling and logging
- **Response Formatting**: Consistent API response structure

## 🛠 **Technology Stack**

### **Backend**
- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL
- **ORM**: Prisma 6.x
- **Authentication**: Supabase
- **Payment Gateway**: Razorpay
- **PDF Generation**: PDFKit

### **Development Tools**
- **Package Manager**: pnpm
- **Linting**: ESLint with Prettier
- **Testing**: Jest
- **API Documentation**: Swagger/OpenAPI
- **Database Migrations**: Prisma Migrate

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js (v18 or higher)
- PostgreSQL database
- pnpm package manager

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shiv_odoo
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your environment variables
   DATABASE_URL="postgresql://username:password@localhost:5432/shiv_odoo"
   RAZORPAY_KEY_ID="your_razorpay_key_id"
   RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   pnpm prisma generate
   
   # Run database migrations
   pnpm prisma migrate dev
   
   # Seed the database (optional)
   pnpm prisma db seed
   ```

5. **Start the application**
   ```bash
   # Development mode
   pnpm run start:dev
   
   # Production mode
   pnpm run build
   pnpm run start:prod
   ```

### **API Documentation**
Once the application is running, visit:
- **API Documentation**: `http://localhost:3001/api`
- **Health Check**: `http://localhost:3001/`

## 📚 **API Endpoints**

### **Authentication**
- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile

### **Contacts**
- `GET /contacts` - List all contacts
- `POST /contacts/create` - Create new contact
- `GET /contacts/:id` - Get contact by ID
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact

### **Products**
- `GET /products` - List all products
- `POST /products/create` - Create new product
- `GET /products/:id` - Get product by ID
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### **Sales**
- `GET /sales/orders` - List sales orders
- `POST /sales/orders` - Create sales order
- `GET /sales/invoices` - List customer invoices
- `POST /sales/invoices` - Create customer invoice
- `PUT /sales/orders/:id/status` - Update order status

### **Purchase**
- `GET /purchase` - List purchase orders
- `POST /purchase` - Create purchase order
- `PUT /purchase/:id/status` - Update order status
- `POST /purchase/:id/convert-to-bill` - Convert to vendor bill

### **Payments**
- `GET /payments` - List all payments
- `POST /payments` - Create payment
- `GET /payments/outstanding/bills` - Get outstanding bills
- `GET /payments/outstanding/invoices` - Get outstanding invoices

### **Reports**
- `GET /reports/invoice/:invoiceNumber` - Generate invoice PDF
- `GET /reports/purchase-order/:id` - Generate purchase order PDF
- `GET /reports/profit-loss` - Generate P&L report
- `GET /reports/balance-sheet` - Generate balance sheet

### **Razorpay Integration**
- `POST /razorpay/create-order` - Create payment order
- `POST /razorpay/verify-payment` - Verify payment
- `GET /razorpay/config` - Get Razorpay configuration

## 🗄 **Database Schema**

The system uses a comprehensive PostgreSQL schema with the following main entities:

- **Users**: System users with role-based access
- **Contacts**: Customers and vendors
- **Products**: Product catalog with pricing and inventory
- **Sales Orders & Invoices**: Sales management
- **Purchase Orders & Bills**: Purchase management
- **Payments**: Payment tracking and processing
- **Chart of Accounts**: Financial account structure
- **Taxes**: Tax configuration and management

## 🔧 **Configuration**

### **Environment Variables**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/shiv_odoo"

# Razorpay
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"

# Application
PORT=3001
NODE_ENV=development
```

### **Database Configuration**
The system uses Prisma for database management. Key configuration files:
- `prisma/schema.prisma` - Database schema definition
- `prisma/migrations/` - Database migration files

## 🧪 **Testing**

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## 📦 **Deployment**

### **Production Build**
```bash
# Build the application
pnpm run build

# Start production server
pnpm run start:prod
```

### **Docker Deployment**
```bash
# Build Docker image
docker build -t shiv-odoo .

# Run container
docker run -p 3001:3001 shiv-odoo
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the UNLICENSED License - see the package.json file for details.

## 🆘 **Support**

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api` endpoint

## 🎯 **Roadmap**

- [ ] Mobile application
- [ ] Advanced reporting dashboard
- [ ] Multi-currency support
- [ ] Advanced inventory management
- [ ] CRM integration
- [ ] Advanced analytics and insights

---

**Built with ❤️ for SHIV Furniture**

*This ERP system is designed to streamline furniture business operations and provide comprehensive business management capabilities.*