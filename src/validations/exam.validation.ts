import { validators } from "../middlewares/validation.middleware";

// Exam creation validation schema
export const createExamSchema = {
  name: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(3),
    validators.maxLength(100)
  ),
  subjectId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
  numQuestions: validators.compose(
    validators.required,
    validators.number,
    validators.min(1)
  ),
  passingMarks: validators.compose(
    validators.required,
    validators.number,
    validators.min(1)
  ),
  totalMarks: validators.compose(
    validators.required,
    validators.number,
    validators.min(1)
  ),
  duration: validators.compose(
    validators.required,
    validators.number,
    validators.min(5) // At least 5 minutes
  ),
  startDate: validators.compose(
    validators.required,
    validators.date,
    validators.futureDate
  ),
  endDate: validators.compose(
    validators.required,
    validators.date,
    validators.futureDate
  ),
};

// Exam update validation schema
export const updateExamSchema = {
  name: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(3),
    validators.maxLength(100)
  ),
  subjectId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
  numQuestions: validators.compose(
    validators.required,
    validators.number,
    validators.min(1)
  ),
  passingMarks: validators.compose(
    validators.required,
    validators.number,
    validators.min(1)
  ),
  totalMarks: validators.compose(
    validators.required,
    validators.number,
    validators.min(1)
  ),
  duration: validators.compose(
    validators.required,
    validators.number,
    validators.min(5)
  ),
  startDate: validators.compose(validators.required, validators.date),
  endDate: validators.compose(validators.required, validators.date),
};

// Update exam status validation schema
export const updateExamStatusSchema = {
  isActive: validators.compose(validators.required, validators.boolean),
};

// Student assignment validation schema
export const assignExamSchema = {
  studentIds: validators.compose(
    validators.required,
    validators.array,
    validators.minLength(1),
    validators.arrayItems(validators.uuid)
  ),
};

// exam id parameter validation schema
export const examIdParamSchema = {
  examId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
};

// ----
// Option validation schema
export const optionSchema = {
  optionText: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(1),
    validators.maxLength(500)
  ),
};
// Cheat event validation schema
export const cheatEventSchema = {
  eventType: validators.compose(
    validators.required,
    validators.string,
    validators.oneOf(["TAB_SWITCH", "FULLSCREEN_EXIT"])
  ),
};
// Add validation schema for exam filtering query parameters
export const examFilterSchema = {
  page: validators.compose(
    validators.number,
    validators.min(1),
  ),
  limit: validators.compose(
    validators.number,
    validators.min(1),
    validators.max(100),
  ),
  searchTerm: validators.compose(
    validators.string,
    validators.maxLength(100),
  ),
  status: validators.compose(
    validators.string,
    validators.oneOf(["active", "draft", "upcoming", "completed"]),
  ),
  subjectId: validators.compose(
    validators.string,
    validators.uuid,
  ),
};


// Reorder questions schema
export const reorderQuestionsSchema = {
  questionIds: validators.compose(
    validators.required,
    validators.array,
    validators.minLength(1),
    validators.arrayItems(validators.compose(
      validators.required,
      validators.string,
      validators.uuid
    ))
  )
};
