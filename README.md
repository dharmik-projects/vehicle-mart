# VehiclePart - Vehicle Spare Parts Marketplace

A full-stack production-ready vehicle spare-parts marketplace built with Next.js, Express.js, MongoDB, and TypeScript.

## Features

### Customer
- 🔍 Smart search with vehicle compatibility filtering
- 🚗 Vehicle selection: Type → Brand → Model → Variant
- 📦 Product browsing with categories, filters, and sorting
- 🛒 Shopping cart with quantity management
- ❤️ Wishlist functionality
- 📋 Checkout with address management
- 📦 Order tracking and history
- ⭐ Reviews and ratings
- 👤 User profile management

### Seller
- 📊 Dashboard with sales statistics
- ➕ Add/edit/delete products
- 📸 Multi-image product uploads (Cloudinary)
- 📦 Stock and price management
- 📋 Order management with status updates

### Admin
- 📊 Full dashboard with database statistics
- 👥 User management
- 🏪 Seller approval/rejection
- 📦 Product approval/rejection
- 📋 Order management
- ⭐ Review moderation

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript, Mongoose
- **Database**: MongoDB Atlas
- **Storage**: Cloudinary (image uploads)
- **Auth**: JWT (access + refresh tokens), bcryptjs

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account (for image uploads)

### Installation

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Or use the shortcut:
npm run install:all
```

### Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI, JWT secrets, and Cloudinary credentials

# Frontend
# frontend/.env.local is already configured for local development
```

### Database Seed

```bash
npm run seed
```

This creates:
- Admin account: `admin@vehiclepart.com` / `admin123`
- Seller account: `seller@vehiclepart.com` / `seller123`
- User account: `user@vehiclepart.com` / `user123`
- Vehicle brands, models, and variants
- Parts categories

### Running Development

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:backend   # API at http://localhost:5000
npm run dev:frontend  # UI at http://localhost:3000
```

## Project Structure

```
vehiclepart/
├── backend/
│   ├── src/
│   │   ├── config/       # DB, Cloudinary config
│   │   ├── middleware/    # Auth, error handling, upload
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API route handlers
│   │   ├── utils/        # Helpers, token generation
│   │   ├── seed.ts       # Database seed script
│   │   └── server.ts     # Express entry point
│   └── package.json
├── frontend/
│   ├── app/              # Next.js App Router pages
│   │   ├── (pages)/      # Public pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── seller/       # Seller dashboard
│   │   └── layout.tsx    # Root layout
│   ├── components/       # Reusable UI components
│   ├── lib/              # API client, store, utils
│   └── package.json
└── package.json          # Root scripts
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products with filters
- `GET /api/products/:slug` - Get product details
- `POST /api/products` - Create product (seller)

### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart/add` - Add to cart
- `PUT /api/cart/item/:id` - Update quantity
- `DELETE /api/cart/item/:id` - Remove from cart

### Orders
- `POST /api/orders` - Place order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details

### And more...
See the full route definitions in `backend/src/routes/`.

## License

MIT
