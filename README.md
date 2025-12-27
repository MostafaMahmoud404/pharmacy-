# Pharmacy Management System Backend

A comprehensive Node.js/Express backend for a pharmacy management system with telemedicine features.

## 🚀 Features

- **User Management**: Multi-role authentication (Admin, Doctor, Customer, Pharmacist)
- **Product Management**: Inventory tracking with low stock alerts
- **Order Management**: Complete e-commerce workflow
- **Prescription Management**: Digital prescription handling
- **Consultation System**: Telemedicine consultations
- **Payment Integration**: Stripe payment processing
- **Real-time Notifications**: Socket.IO integration
- **File Upload**: Cloudinary integration for images and documents
- **Email Services**: Automated notifications and reports
- **Dashboard Analytics**: Comprehensive business intelligence

## 🛡️ Security Features

- JWT authentication with httpOnly cookies
- Rate limiting for API endpoints
- Input validation and sanitization
- CORS configuration
- Role-based access control
- Secure file upload handling

## 📊 Performance Optimizations

- MongoDB aggregation pipelines for efficient queries
- Database indexing optimization
- Parallel data fetching
- Caching strategies
- Error logging with Winston

## 🏗️ Architecture

```
src/
├── controllers/     # Request handlers
├── models/         # Mongoose schemas
├── routes/         # API endpoints
├── middleware/     # Custom middleware
├── utils/          # Helper functions
├── config/         # Configuration files
└── uploads/        # File storage
```

## 🔧 Installation

1. Clone the repository

```bash
git clone <repository-url>
cd pharmacy-backend
```

2. Install dependencies

```bash
npm install
```

3. Create environment file

```bash
cp .env.example .env
```

4. Configure environment variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/pharmacy
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d
COOKIE_SECRET=your-cookie-secret
FRONTEND_URL=http://localhost:4200
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
STRIPE_SECRET_KEY=your-stripe-key
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

5. Start the server

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

All endpoints are prefixed with `/api/v1`

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/forgot-password` - Password reset request
- `POST /api/v1/auth/reset-password` - Password reset

### Users

- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/users` - Get all users (Admin only)

### Products

- `GET /api/v1/products` - Get all products
- `POST /api/v1/products` - Create product (Admin only)
- `GET /api/v1/products/:id` - Get product by ID
- `PUT /api/v1/products/:id` - Update product (Admin only)
- `DELETE /api/v1/products/:id` - Delete product (Admin only)

### Orders

- `GET /api/v1/orders` - Get user orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id/status` - Update order status

### Prescriptions

- `GET /api/v1/prescriptions` - Get prescriptions
- `POST /api/v1/prescriptions` - Create prescription (Doctor only)
- `PUT /api/v1/prescriptions/:id` - Update prescription status

### Consultations

- `GET /api/v1/consultations` - Get consultations
- `POST /api/v1/consultations` - Book consultation
- `PUT /api/v1/consultations/:id` - Update consultation

### Dashboard

- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/admin/stats` - Get admin statistics (Admin only)

## 🔒 Security Measures

1. **Authentication & Authorization**

   - JWT tokens with httpOnly cookies
   - Role-based middleware protection
   - Password hashing with bcrypt

2. **API Security**

   - Rate limiting (100 requests per 15 minutes per IP)
   - Input validation with express-validator
   - CORS configuration for allowed origins

3. **Data Protection**
   - MongoDB injection prevention
   - XSS protection
   - Secure file upload validation

## 📈 Performance Features

- **Database Optimization**

  - Proper indexing on frequently queried fields
  - Aggregation pipelines for complex queries
  - Efficient data fetching with population

- **Caching**

  - Redis integration for session management
  - Response caching for static data

- **Monitoring**
  - Winston logging for error tracking
  - Request/response logging
  - Performance monitoring

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data
- `npm test` - Run test suite

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support, email support@pharmacy.com or create an issue in the repository.

## 🔄 Recent Updates

### Version 1.1.0

- ✅ Added API versioning (/api/v1)
- ✅ Enhanced dashboard performance with aggregation pipelines
- ✅ Implemented comprehensive logging with Winston
- ✅ Fixed security vulnerabilities
- ✅ Optimized database queries
- ✅ Added rate limiting
- ✅ Improved error handling
- ✅ Enhanced JWT security with cookies

### Security Fixes

- Protected all vulnerable routes
- Added input validation
- Implemented secure cookie handling
- Fixed MongoDB injection vulnerabilities

### Performance Improvements

- Optimized dashboard queries (reduced from 15+ queries to 6 parallel aggregations)
- Removed duplicate database indexes
- Added efficient data fetching with $lookup operations
- Implemented parallel promise execution
