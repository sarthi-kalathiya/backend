import { validators } from "../middlewares/validation.middleware";

// ----
// Question ID parameter validation schema
export const questionIdParamSchema = {
  questionId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
};

// Update question validation schema
export const updateQuestionSchema = {
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

// Bulk questions validation schema
export const bulkQuestionsSchema = {
  questions: validators.compose(
    validators.required,
    validators.array,
    validators.minLength(1),
    validators.arrayObjects(questionSchema)
  ),
};
