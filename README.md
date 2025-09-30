# Pawnshop Management System

A comprehensive pawnshop management system built with Angular frontend and Node.js/Express backend.

## 🏗️ Architecture

### Frontend (pawn-web)
- **Framework**: Angular 19
- **Styling**: Tailwind CSS
- **Target Resolution**: 1366x768px (HD)
- **Features**: 
  - Role-based dashboards
  - Dark/Light theme toggle
  - Responsive design
  - Real-time updates

### Backend (pawn-api)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Features**:
  - RESTful API
  - JWT Authentication
  - Role-based access control
  - Audit trail logging
  - Multi-branch support

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Angular CLI (v19)

### Database Setup
1. Create a PostgreSQL database named `pawnshop_db`
2. Update database credentials in `pawn-api/.env`
3. Run the schema setup:
   ```bash
   cd pawn-api
   npm run setup-db
   ```

### Backend Setup
```bash
cd pawn-api
npm install
npm run dev
```
Server runs on: http://localhost:3000

### Frontend Setup
```bash
cd pawn-web
npm install
ng serve
```
Application runs on: http://localhost:4200

## 👥 User Roles & Default Accounts

| Role | Username | Password | Capabilities |
|------|----------|----------|-------------|
| Admin | admin | admin123 | Full system access, user management, settings |
| Cashier | cashier | cashier123 | Loan processing, redemptions, auction sales |
| Appraiser | appraiser | appraiser123 | Item appraisal, pawner management |
| Manager | manager | manager123 | Reports, vouchers, branch oversight |
| Auctioneer | auctioneer | auctioneer123 | Auction management, expired items |

## 📊 Core Features

### Loan Management
- **New Loan**: Calculate interest, service charges, net proceeds
- **Redeem**: Full payment with interest and penalties
- **Partial Payment**: Reduce principal amount
- **Additional Loan**: Increase loan amount on existing items
- **Renew**: Extend loan term with payment

### Business Rules
- **Jewelry**: 3% advance interest
- **Appliances**: 6% advance interest  
- **Service Charge**: 0.01 per 100 PHP (minimum 5 PHP for loans ≥ 500 PHP)

### Audit Trails
- Track all CRUD operations
- User activity logging
- Branch-level reporting
- Timestamp and IP tracking

## 🎨 UI Components

### Navbar
- Role-specific navigation
- Theme toggle (dark/light)
- User profile dropdown
- Mobile responsive menu

### Dashboard Cards
- Transaction summaries
- Real-time KPIs
- Role-based metrics
- Clickable drill-downs

## 🔧 Development

### File Structure
```
pawnshop/
├── pawn-web/          # Angular frontend
│   ├── src/app/
│   │   ├── auth/      # Authentication components
│   │   ├── core/      # Services, models, guards
│   │   ├── pages/     # Dashboard components
│   │   └── shared/    # Reusable components
└── pawn-api/          # Node.js backend
    ├── config/        # Database configuration
    ├── middleware/    # Authentication, audit logging
    ├── routes/        # API endpoints
    └── database/      # SQL schemas and migrations
```

### API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/auth/profile` - Get user profile
- `GET /api/dashboard/:role` - Dashboard data
- `GET /api/health` - Server health check

## 🔒 Security Features
- JWT token authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention

## 📱 Responsive Design
- Optimized for 1366x768 resolution
- Mobile-friendly navigation
- Adaptive layouts
- Touch-friendly controls

## ⚡ Quick Start
1. Clone the repository
2. Set up PostgreSQL database
3. Install dependencies for both frontend and backend
4. Run `npm run dev` in both directories
5. Access the application at http://localhost:4200
6. Login with demo credentials

## 📄 License
ISC License

## 🤝 Contributing
Please read the contribution guidelines before submitting pull requests.

---

**Status**: ✅ Basic framework complete
**Next Steps**: Implement loan calculation engine, complete CRUD operations, add reporting features