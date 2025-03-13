# Online Exam System API

A RESTful API for an online examination system built with Express, TypeScript, and Prisma.

## Features

- User authentication (JWT)
- Role-based authorization (Admin, Teacher, Student)
- Subject management
- Exam creation and management
- Question and answer management
- Student exam assignment
- Anti-cheating measures
- Result tracking and analysis

## Tech Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication

## Getting Started

### Prerequisites

- Node.js (v14+)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd online-exam-backend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure environment variables:
   - Copy the `.env.example` file to `.env`
   - Update the database connection string and other settings

4. Apply Prisma migrations:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## API Endpoints

### Authentication

- `POST /api/auth/admin/signin` - Admin login
- `POST /api/auth/admin/signup` - Register root admin (initial setup only)
- `POST /api/auth/signin` - User login (for teachers and students)
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Logout

### User Management

- `GET /api/user/profile` - Get current user profile
- `PUT /api/user/profile` - Update current user profile
- `POST /api/user/complete-profile` - Complete user profile (first login)
- `PATCH /api/user/password` - Change password

### Admin Operations

- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `GET /api/admin/users/:userId` - Get user details
- `PUT /api/admin/users/:userId` - Update user
- `PATCH /api/admin/users/:userId/status` - Activate/deactivate user
- `POST /api/admin/users/:userId/reset-password` - Reset user's password

### Subject Management

- `GET /api/subjects` - Get all subjects
- `POST /api/admin/subjects` - Create new subject
- `PUT /api/admin/subjects/:subjectId` - Update subject
- `PATCH /api/admin/subjects/:subjectId/status` - Activate/deactivate subject

### Exam Management (Teacher)

- `GET /api/teacher/exams` - Get all exams created by teacher
- `POST /api/teacher/exams` - Create a new exam
- `GET /api/teacher/exams/:examId` - Get exam details
- `PUT /api/teacher/exams/:examId` - Update exam
- `PATCH /api/teacher/exams/:examId/status` - Activate/deactivate exam

### Question Management (Teacher)

- `GET /api/teacher/exams/:examId/questions` - Get all questions for an exam
- `POST /api/teacher/exams/:examId/questions` - Add question with options
- `PUT /api/teacher/exams/:examId/questions/:questionId` - Update question and options
- `DELETE /api/teacher/exams/:examId/questions/:questionId` - Remove question

## Project Structure

```
.
├── prisma/             # Prisma schema and migrations
├── src/
│   ├── config/         # Configuration files
│   ├── constants/      # Constant values and enums
│   ├── controllers/    # Request handlers
│   ├── middlewares/    # Express middlewares
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── validators/     # Request validation
│   └── index.ts        # Application entry point
├── .env                # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 