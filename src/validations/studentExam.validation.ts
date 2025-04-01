import { validators } from "../middlewares/validation.middleware";

// Response validation schema for individual responses
export const responseSchema = {
  questionId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
  optionId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
};


// ----
// Exam responses validation schema (whole submission)
export const examResponsesSchema = {
  responses: validators.compose(validators.required, validators.array),
};

// Response validation function for array of responses
export const validateResponseArray = (
  responses: any[],
  allowEmpty = false
): { valid: boolean; message?: string } => {
  // Check if array can be empty based on the allowEmpty parameter
  if (!allowEmpty && responses.length === 0) {
    return {
      valid: false,
      message: "Responses array cannot be empty",
    };
  }

  // Validate individual responses if they exist
  if (responses.length > 0) {
    const invalidResponses = responses.filter(
      (r) => !r || typeof r !== "object" || !r.questionId || !r.optionId
    );

    if (invalidResponses.length > 0) {
      return {
        valid: false,
        message: "Each response must have questionId and optionId fields",
      };
    }
  }

  return { valid: true };
};
