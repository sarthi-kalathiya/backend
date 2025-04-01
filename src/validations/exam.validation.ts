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
    validators.string,
    validators.minLength(3),
    validators.maxLength(100)
  ),
  subjectId: validators.compose(validators.string, validators.uuid),
  numQuestions: validators.compose(validators.number, validators.min(1)),
  passingMarks: validators.compose(validators.number, validators.min(1)),
  totalMarks: validators.compose(validators.number, validators.min(1)),
  duration: validators.compose(validators.number, validators.min(5)),
  startDate: validators.compose(validators.date),
  endDate: validators.compose(validators.date),
};

// Update exam status validation schema
export const updateExamStatusSchema = {
  isActive: validators.compose(validators.required, validators.boolean),
};

// Question creation validation schema
export const questionSchema = {
  questionText: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(3),
    validators.maxLength(1000)
  ),
  hasImage: validators.compose(validators.boolean),
  images: validators.compose(validators.array),
  marks: validators.compose(
    validators.required,
    validators.number,
    validators.min(0.5)
  ),
  negativeMarks: validators.compose(validators.number, validators.min(0)),
  options: validators.compose(validators.required, validators.array),
  correctOptionIndex: validators.compose(
    validators.required,
    validators.number,
    validators.min(0)
  ),
};

// Student assignment validation schema
export const assignExamSchema = {
  studentIds: validators.compose(validators.required, validators.array),
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
