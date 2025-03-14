import prisma from '../utils/prismaClient';
import { BadRequestError, NotFoundError } from '../utils/errors';

export const getAllSubjects = async (includeInactive = false) => {
  const whereCondition: any = {};
  
  if (!includeInactive) {
    whereCondition.isActive = true;
  }

  const subjects = await prisma.subject.findMany({
    where: whereCondition,
    orderBy: { name: 'asc' }
  });

  return subjects;
};

export const getSubjectById = async (subjectId: string) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  return subject;
};

export const createSubject = async (name: string) => {
  // Check if subject name already exists
  const existingSubject = await prisma.subject.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      }
    }
  });

  if (existingSubject) {
    throw new BadRequestError('Subject with this name already exists');
  }

  const subject = await prisma.subject.create({
    data: { name }
  });

  return subject;
};

export const updateSubject = async (subjectId: string, name: string) => {
  // Check if subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  // Check if the new name conflicts with another subject
  if (name !== subject.name) {
    const existingSubject = await prisma.subject.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        id: { not: subjectId }
      }
    });

    if (existingSubject) {
      throw new BadRequestError('Subject with this name already exists');
    }
  }

  const updatedSubject = await prisma.subject.update({
    where: { id: subjectId },
    data: { name }
  });

  return updatedSubject;
};

export const updateSubjectStatus = async (subjectId: string, isActive: boolean) => {
  // Check if subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  const updatedSubject = await prisma.subject.update({
    where: { id: subjectId },
    data: { isActive }
  });

  return updatedSubject;
};

export const getUserSubjects = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.student) {
    const studentSubjects = await prisma.studentsOnSubjects.findMany({
      where: { studentId: user.student.id },
      include: {
        subject: true
      }
    });

    return studentSubjects.map(item => item.subject);
  } else if (user.teacher) {
    const teacherSubjects = await prisma.teachersOnSubjects.findMany({
      where: { teacherId: user.teacher.id },
      include: {
        subject: true
      }
    });

    return teacherSubjects.map(item => item.subject);
  }

  return [];
};

export const assignSubjectsToUser = async (userId: string, subjectIds: string[]) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify all subject IDs exist
  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } }
  });

  if (subjects.length !== subjectIds.length) {
    throw new BadRequestError('One or more subjects not found');
  }

  if (user.student) {
    // Get existing assignments to check for duplicates
    const existingAssignments = await prisma.studentsOnSubjects.findMany({
      where: { 
        studentId: user.student.id,
        subjectId: { in: subjectIds }
      }
    });

    // Filter out already assigned subjects
    const newSubjectIds = subjectIds.filter(
      subjectId => !existingAssignments.some(
        assignment => assignment.subjectId === subjectId
      )
    );

    if (newSubjectIds.length === 0) {
      throw new BadRequestError('All subjects are already assigned to this student');
    }

    // Add new subject assignments
    await Promise.all(
      newSubjectIds.map(subjectId =>
        prisma.studentsOnSubjects.create({
          data: {
            studentId: user.student!.id,
            subjectId
          }
        })
      )
    );

    // Get all subjects for the student
    const studentSubjects = await prisma.studentsOnSubjects.findMany({
      where: { studentId: user.student.id },
      include: {
        subject: true
      }
    });

    return studentSubjects.map((item: SubjectWithRelations) => item.subject);

  } else if (user.teacher) {
    // Get existing assignments to check for duplicates
    const existingAssignments = await prisma.teachersOnSubjects.findMany({
      where: { 
        teacherId: user.teacher.id,
        subjectId: { in: subjectIds }
      }
    });

    // Filter out already assigned subjects
    const newSubjectIds = subjectIds.filter(
      subjectId => !existingAssignments.some(
        assignment => assignment.subjectId === subjectId
      )
    );

    if (newSubjectIds.length === 0) {
      throw new BadRequestError('All subjects are already assigned to this teacher');
    }

    // Add new subject assignments
    await Promise.all(
      newSubjectIds.map(subjectId =>
        prisma.teachersOnSubjects.create({
          data: {
            teacherId: user.teacher!.id,
            subjectId
          }
        })
      )
    );

    // Get all subjects for the teacher
    const teacherSubjects = await prisma.teachersOnSubjects.findMany({
      where: { teacherId: user.teacher.id },
      include: {
        subject: true
      }
    });

    return teacherSubjects.map((item: SubjectWithRelations) => item.subject);
  }

  throw new BadRequestError('User must be a student or teacher to assign subjects');
};

interface SubjectWithRelations {
  subject: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
}

export const assignSubjectToUser = async (userId: string, subjectId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  if (user.student) {
    // Check if the subject is already assigned to the student
    const existingAssignment = await prisma.studentsOnSubjects.findUnique({
      where: {
        studentId_subjectId: {
          studentId: user.student.id,
          subjectId: subjectId
        }
      }
    });

    if (existingAssignment) {
      throw new BadRequestError('Subject is already assigned to this student');
    }

    // Add the new subject assignment
    await prisma.studentsOnSubjects.create({
      data: {
        studentId: user.student.id,
        subjectId: subjectId
      }
    });

    // Get all subjects for the student
    const studentSubjects = await prisma.studentsOnSubjects.findMany({
      where: { studentId: user.student.id },
      include: {
        subject: true
      }
    });

    return studentSubjects.map((item: SubjectWithRelations) => item.subject);

  } else if (user.teacher) {
    // Check if the subject is already assigned to the teacher
    const existingAssignment = await prisma.teachersOnSubjects.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId: user.teacher.id,
          subjectId: subjectId
        }
      }
    });

    if (existingAssignment) {
      throw new BadRequestError('Subject is already assigned to this teacher');
    }

    // Add the new subject assignment
    await prisma.teachersOnSubjects.create({
      data: {
        teacherId: user.teacher.id,
        subjectId: subjectId
      }
    });

    // Get all subjects for the teacher
    const teacherSubjects = await prisma.teachersOnSubjects.findMany({
      where: { teacherId: user.teacher.id },
      include: {
        subject: true
      }
    });

    return teacherSubjects.map((item: SubjectWithRelations) => item.subject);
  }

  throw new BadRequestError('User must be a student or teacher to assign subjects');
}; 