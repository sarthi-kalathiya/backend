import { validators } from "../middlewares/validation.middleware";

// Subject creation validation schema
export const createSubjectSchema = {
  name: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(100)
  ),
  code: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(20),
    validators.subjectCodePattern
  ),
  description: validators.compose(validators.string, validators.maxLength(500)),
  credits: validators.compose(
    validators.number,
    validators.min(1),
    validators.max(10)
  ),
};

// Subject update validation schema
export const updateSubjectSchema = {
  name: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(100)
  ),
  code: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(20),
    validators.subjectCodePattern
  ),
  description: validators.compose(validators.string, validators.maxLength(500)),
  credits: validators.compose(
    validators.number,
    validators.min(1),
    validators.max(10)
  ),
};

// Update subject status validation schema
export const updateSubjectStatusSchema = {
  isActive: validators.compose(validators.required, validators.boolean),
};

// Subject assignment validation schema
export const assignSubjectsSchema = {
  subjectIds: validators.compose(validators.required, validators.array),
};
// ----