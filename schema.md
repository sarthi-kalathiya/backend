### Collections & Attributes

#### **1. users**

```json
{
  "_id": ObjectId,
  "name": String,
  "email": String,
  "password": String,  // Hashed
  "role": String, // "admin" | "student" | "teacher"
  "contact_number": String,  // Added contact number
  "email": String,
  "created_at": ISODate,
  "updated_at": ISODate,
  "is_active": Boolean
}
```

#### **2. subjects**

```json
{
  "_id": ObjectId,
  "name": String,
  "is_active": Boolean,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### **3. students**

```json
{
  "_id": ObjectId,  // Reference to users._id
  "learns": [ObjectId],  // Array of subject._id
  "joining_date": ISODate,
  "completed_exams": Number,  // Count of exams taken
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### **4. teachers**

```json
{
  "_id": ObjectId,  // Reference to users._id
  "teaches": [ObjectId],  // Array of subject._id
  "experience": Number,  // Years of experience
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### **5. exams**

```json
{
  "_id": ObjectId,
  "owner": ObjectId,  // Reference to teachers.user_id
  "name": String,
  "banned_students":[ObjectId], // Reference to correct students._id
  "subject": ObjectId,  // Reference to subjects._id
  "num_questions": Number,
  "passing_marks": Number,
  "duration": Number,  // In minutes
  "questions": [
    {
      "question_id": ObjectId,  // Unique identifier for each question
      "question_text": String,
      "images": [String],
      "has_image": Boolean,
      "options": [
        {
          "option_id": ObjectId,  // Unique identifier for each option
          "option_text": String
        }
      ],
      "correct_option": ObjectId  // Reference to correct option_id
    }
  ],
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### **6. student_exams**

```json
{
  "_id": ObjectId,
  "student_id": ObjectId,  // Reference to students.user_id
  "exam_id": ObjectId,  // Reference to exams._id
  "status": "not_started" | "in_progress" | "completed",
  "start_time": ISODate,
  "end_time": ISODate,  // Last date & time allowed to start
  "submitted_at": ISODate,
  "auto_submitted": Boolean  // Indicates if submission was automated
}
```

#### **7. results**

```json
{
  "_id": ObjectId,
  "student_exam_id": ObjectId,  // Reference to student_exams._id
  "marks": Number,
  "time_taken": Number,  // In seconds
  "status": "pass" | "fail",
  "created_at": ISODate
}
```

#### **8. answer_sheets**

```json
{
  "_id": ObjectId,
  "student_exam_id": ObjectId,  // Reference to student_exams._id
  "responses": [
    {
      "question_id": ObjectId,  // Reference to exams.questions.question_id
      "selected_option": ObjectId  // Reference to exams.questions.options.option_id
    }
  ],
  "submitted_at": ISODate
}
```

#### **9. anti_cheating_logs**

```json
{
  "_id": ObjectId,
  "student_exam_id": ObjectId,  // Reference to student_exams._id
  "event_type": "tab_switch" | "fullscreen_exit",
  "event_time": ISODate
}
```


### Admin Endpoints  
**Authentication**  
- `POST /api/admin/signup`  
- `POST /api/admin/signin`  

**Teachers Management**  
- `GET /api/admin/teachers`  
- `POST /api/admin/teachers`  
- `PUT /api/admin/teachers/:teacherId`  

**Students Management**  
- `GET /api/admin/students`  
- `POST /api/admin/students`  
- `PUT /api/admin/students/:studentId`  

**Subjects Management**  
- `GET /api/admin/subjects`  
- `POST /api/admin/subjects`  
- `PUT /api/admin/subjects/:subjectId`  

---

### Teacher Endpoints  
**Authentication**  
- `POST /api/teacher/signup`  
- `POST /api/teacher/signin`  

**Exam Management**  
- `POST /api/teacher/exams`  
- `GET /api/teacher/exams`  
- `GET /api/teacher/exams/:examId`  
- `PUT /api/teacher/exams/:examId`  

**Exam Assignment & Student Management**  
- `POST /api/teacher/exams/:examId/assign`  
- `GET /api/teacher/exams/:examId/students`  
- `DELETE /api/teacher/exams/:examId/students/:studentId`  
- `POST /api/teacher/exams/:examId/ban/:studentId`  

**Results Management**  
- `GET /api/teacher/exams/:examId/results`  
- `GET /api/teacher/results/:studentExamId` (Optional)  

---

### Student Endpoints  
**Authentication**  
- `POST /api/student/signup`  
- `POST /api/student/signin`  

**Exam Interaction**  
- `GET /api/student/exams/assigned`  
- `GET /api/student/exams/completed`  
- `GET /api/student/exams/:examId`  
- `POST /api/student/exams/:examId/start`  
- `POST /api/student/exams/:examId/submit`  

**Results Viewing**  
- `GET /api/student/results`  
- `GET /api/student/results/:examId` (Optional)  

**Cheating Reporting**  
- `POST /api/student/cheating/report`