#!/bin/bash

echo "🔧 Setting up environment variables..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/nmit_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-$(date +%s)"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001

# Razorpay (optional)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
EOF
    echo "✅ .env file created!"
else
    echo "⚠️  .env file already exists, skipping creation."
fi

echo "🔍 Checking PostgreSQL status..."
if command -v brew &> /dev/null; then
    if brew services list | grep postgresql | grep started &> /dev/null; then
        echo "✅ PostgreSQL is running"
    else
        echo "⚠️  PostgreSQL is not running. Starting it..."
        brew services start postgresql
    fi
else
    echo "⚠️  Homebrew not found. Please ensure PostgreSQL is running manually."
fi

echo "🗄️  Checking if database exists..."
if psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw nmit_db; then
    echo "✅ Database 'nmit_db' exists"
else
    echo "📦 Creating database 'nmit_db'..."
    createdb -h localhost -U postgres nmit_db
fi

echo "🚀 Running database migrations..."
npx prisma migrate deploy

echo "🎉 Setup complete! You can now start the backend with: npm run start:dev"
