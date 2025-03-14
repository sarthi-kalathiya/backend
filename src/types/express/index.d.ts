import { User, Student, Teacher } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        student?: Student | null;
        teacher?: Teacher | null;
      };
      profileCompleted?: boolean;
    }
  }
}

export {}; 