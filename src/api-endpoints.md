# API Endpoints for Online Exam System

### Reporting
- `GET /api/admin/reports/exams` - Exam statistics and performance
- `GET /api/admin/reports/users` - User activity and performance

## Teacher Operations

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