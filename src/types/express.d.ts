import { User, Student, Teacher } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        student?: Student;
        teacher?: Teacher;
      };
    }
  }
}
