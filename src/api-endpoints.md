# API Endpoints for Online Exam System

## Authentication & User Management

### Admin Authentication
- `POST /api/auth/admin/signin` - Admin login
- `POST /api/auth/admin/signup` - Register root admin (initial setup only)
- `POST /api/auth/refresh-token` - Refresh JWT token (common for all users)
- `POST /api/auth/logout` - Logout (common for all users)

### User Authentication
- `POST /api/auth/signin` - User login (for teachers and students)
- `POST /api/user/complete-profile` - Complete user profile (first login for teachers/students)
- `PATCH /api/user/password` - Change password (for all user types)
- `GET /api/user/profile` - Get current user profile
- `PUT /api/user/profile` - Update current user profile

## Admin Operations

### User Management
- `GET /api/admin/users` - Get all users with filters (role, status, etc.)
- `POST /api/admin/users` - Create new user (teacher or student)
- `GET /api/admin/users/:userId` - Get specific user details
- `PUT /api/admin/users/:userId` - Update user details
- `PATCH /api/admin/users/:userId/status` - Activate/deactivate user
- `POST /api/admin/users/:userId/reset-password` - Reset user's password

### Subject Management
- `GET /api/admin/subjects` - Get all subjects
- `POST /api/admin/subjects` - Create new subject
- `GET /api/admin/subjects/:subjectId` - Get subject details
- `PUT /api/admin/subjects/:subjectId` - Update subject details
- `PATCH /api/admin/subjects/:subjectId/status` - Activate/deactivate subject

### User-Subject Assignments
- `GET /api/admin/users/:userId/subjects` - Get subjects for a specific user
- `PATCH /api/admin/users/:userId/subjects` - Assign/remove subjects for a user

### Reporting
- `GET /api/admin/reports/exams` - Exam statistics and performance
- `GET /api/admin/reports/users` - User activity and performance

## Teacher Operations

### Exam Management
- `GET /api/teacher/exams` - Get all exams created by the teacher
- `POST /api/teacher/exams` - Create a new exam
- `GET /api/teacher/exams/:examId` - Get exam details
- `PUT /api/teacher/exams/:examId` - Update exam details
- `PATCH /api/teacher/exams/:examId/status` - Activate/deactivate exam

### Question Management
- `GET /api/teacher/exams/:examId/questions` - Get all questions for an exam
- `POST /api/teacher/exams/:examId/questions` - Add question with options to an exam
- `PUT /api/teacher/exams/:examId/questions/:questionId` - Update question and its options
- `PATCH /api/teacher/exams/:examId/questions/:questionId/status` - Activate/deactivate question

### Student Assignment & Monitoring
- `POST /api/teacher/exams/:examId/assign` - Assign exam to students
- `GET /api/teacher/exams/:examId/students` - Get students assigned to an exam with status
- `PATCH /api/teacher/exams/:examId/students/:studentId/ban` - Ban/unban student from exam
- `GET /api/teacher/exams/:examId/results` - Get all results for an exam
- `GET /api/teacher/exams/:examId/students/:studentId/result` - Get specific student's result for an exam
- `GET /api/teacher/exams/:examId/students/:studentId/answer-sheet` - Get student's answer sheet
- `GET /api/teacher/exams/:examId/students/:studentId/cheat-logs` - Get cheating logs for a student

## Student Operations

### Exam Access
- `GET /api/student/exams` - Get all exams (with filters for assigned/completed)
- `GET /api/student/exams/:examId` - Get exam details
- `POST /api/student/exams/:examId/start` - Start an exam
- `POST /api/student/exams/:examId/submit` - Submit an exam
- `GET /api/student/exams/:examId/questions` - Get questions for active exam

### Response Management
- `POST /api/student/exams/:examId/responses` - Save responses during exam
- `GET /api/student/exams/:examId/responses` - Get saved responses for current exam

### Results
- `GET /api/student/results` - Get results for all exams
- `GET /api/student/exams/:examId/result` - Get result for specific exam
- `GET /api/student/exams/:examId/answer-sheet` - View submitted answer sheet

### Anti-Cheating
- `POST /api/student/exams/:examId/cheat-event` - Log cheating event (tab switch, etc.)

## System Endpoints

### Public Information
- `GET /api/subjects` - Get all active subjects
- `GET /api/health` - API health check
- `GET /api/docs` - API documentation 