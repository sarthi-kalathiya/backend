import prisma from "../utils/prismaClient";
import { BadRequestError, NotFoundError } from "../utils/errors";

// Get all subjects
type SubjectWithRelations = {
  subject: {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

// Get all subjects
export const getAllSubjects = async (
  includeInactive = false,
  searchTerm?: string,
  page = 1,
  pageSize = 10,
  filterActive?: boolean
) => {
  const whereCondition: any = {};

  // Filter by active status
  if (filterActive !== undefined) {
    // If filterActive is provided, filter by that exact status
    whereCondition.isActive = filterActive;
  } else if (!includeInactive) {
    // If includeInactive is false, show only active subjects
    whereCondition.isActive = true;
  }

  // Add search term filter if provided
  if (searchTerm) {
    whereCondition.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { code: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Get total count of matching subjects
  const totalItems = await prisma.subject.count({
    where: whereCondition,
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get subjects with pagination
  const subjects = await prisma.subject.findMany({
    where: whereCondition,
    orderBy: { name: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Return data with pagination info
  return {
    data: subjects,
    totalItems,
    totalPages,
    currentPage: page,
    pageSize,
  };
};

// Get subject by ID
export const getSubjectById = async (subjectId: string) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError("Subject not found");
  }

  return subject;
};

// Create subject
export const createSubject = async (
  name: string,
  code: string,
  description: string = "",
  credits: number = 3,
  isActive: boolean = true
) => {
  // Check if subject name already exists
  const existingSubjectWithName = await prisma.subject.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingSubjectWithName) {
    throw new BadRequestError("Subject with this name already exists");
  }

  // Check if subject code already exists
  const existingSubjectWithCode = await prisma.subject.findFirst({
    where: {
      code: {
        equals: code,
        mode: "insensitive",
      },
    },
  });

  if (existingSubjectWithCode) {
    throw new BadRequestError("Subject with this code already exists");
  }

  const subject = await prisma.subject.create({
    data: {
      name,
      code,
      description,
      credits: credits,
      isActive,
    },
  });

  return subject;
};

// Update subject
export const updateSubject = async (
  subjectId: string,
  name: string,
  code: string,
  description?: string,
  credits?: number,
  isActive?: boolean
) => {
  // Check if subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError("Subject not found");
  }

  // Check if the new name conflicts with another subject
  if (name !== subject.name) {
    const existingSubject = await prisma.subject.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        id: { not: subjectId },
      },
    });

    if (existingSubject) {
      throw new BadRequestError("Subject with this name already exists");
    }
  }

  // Check if the new code conflicts with another subject
  if (code !== subject.code) {
    const existingSubjectWithCode = await prisma.subject.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
        id: { not: subjectId },
      },
    });

    if (existingSubjectWithCode) {
      throw new BadRequestError("Subject with this code already exists");
    }
  }

  const updateData: any = { name, code, credits };
  if (description !== undefined) {
    updateData.description = description;
  }

  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }
  const updatedSubject = await prisma.subject.update({
    where: { id: subjectId },
    data: updateData,
  });

  return updatedSubject;
};

// Update subject status
export const updateSubjectStatus = async (
  subjectId: string,
  isActive: boolean
) => {
  // Check if subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError("Subject not found");
  }

  const updatedSubject = await prisma.subject.update({
    where: { id: subjectId },
    data: { isActive },
  });

  return updatedSubject;
};

// Get user subjects
export const getUserSubjects = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.student) {
    const studentSubjects = await prisma.studentsOnSubjects.findMany({
      where: { studentId: user.student.id },
      include: {
        subject: true,
      },
    });

    return studentSubjects.map((item: SubjectWithRelations) => item.subject);
  } else if (user.teacher) {
    const teacherSubjects = await prisma.teachersOnSubjects.findMany({
      where: { teacherId: user.teacher.id },
      include: {
        subject: true,
      },
    });

    return teacherSubjects.map((item: SubjectWithRelations) => item.subject);
  }

  return [];
};

// Assign subjects to user
export const assignSubjectsToUser = async (
  userId: string,
  subjectIds: string[]
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Verify all subject IDs exist
  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
  });

  if (subjects.length !== subjectIds.length) {
    throw new BadRequestError("One or more subjects not found");
  }

  const isStudent = !!user.student;
  const modelName = isStudent ? "studentsOnSubjects" : "teachersOnSubjects";
  const userIdField = isStudent ? "studentId" : "teacherId";
  const userRoleId = isStudent ? user.student!.id : user.teacher!.id;
  const userType = isStudent ? "student" : "teacher";

  // Get existing assignments to check for duplicates
  const existingAssignments = await prisma[modelName].findMany({
    where: {
      [userIdField]: userRoleId,
      subjectId: { in: subjectIds },
    },
  });

  // Filter out already assigned subjects
  const newSubjectIds = subjectIds.filter(
    (subjectId) =>
      !existingAssignments.some(
        (assignment: { subjectId: string }) =>
          assignment.subjectId === subjectId
      )
  );

  if (newSubjectIds.length === 0) {
    throw new BadRequestError(
      `All subjects are already assigned to this ${userType}`
    );
  }

  // Add new subject assignments
  await Promise.all(
    newSubjectIds.map((subjectId) =>
      prisma[modelName].create({
        data: {
          [userIdField]: userRoleId,
          subjectId,
        },
      })
    )
  );

  // Get all subjects for the user
  const userSubjects = await prisma[modelName].findMany({
    where: { [userIdField]: userRoleId },
    include: {
      subject: true,
    },
  });

  return userSubjects.map((item: SubjectWithRelations) => item.subject);
};

// Assign subject to user
export const assignSubjectToUser = async (
  userId: string,
  subjectId: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError("Subject not found");
  }

  if (user.student) {
    // Check if the subject is already assigned to the student
    const existingAssignment = await prisma.studentsOnSubjects.findUnique({
      where: {
        studentId_subjectId: {
          studentId: user.student.id,
          subjectId: subjectId,
        },
      },
    });

    if (existingAssignment) {
      throw new BadRequestError("Subject is already assigned to this student");
    }

    // Add the new subject assignment
    await prisma.studentsOnSubjects.create({
      data: {
        studentId: user.student.id,
        subjectId: subjectId,
      },
    });

    // Get all subjects for the student
    const studentSubjects = await prisma.studentsOnSubjects.findMany({
      where: { studentId: user.student.id },
      include: {
        subject: true,
      },
    });

    return studentSubjects.map((item: SubjectWithRelations) => item.subject);
  } else if (user.teacher) {
    // Check if the subject is already assigned to the teacher
    const existingAssignment = await prisma.teachersOnSubjects.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId: user.teacher.id,
          subjectId: subjectId,
        },
      },
    });

    if (existingAssignment) {
      throw new BadRequestError("Subject is already assigned to this teacher");
    }

    // Add the new subject assignment
    await prisma.teachersOnSubjects.create({
      data: {
        teacherId: user.teacher.id,
        subjectId: subjectId,
      },
    });

    // Get all subjects for the teacher
    const teacherSubjects = await prisma.teachersOnSubjects.findMany({
      where: { teacherId: user.teacher.id },
      include: {
        subject: true,
      },
    });

    return teacherSubjects.map((item: SubjectWithRelations) => item.subject);
  }

  throw new BadRequestError(
    "User must be a student or teacher to assign subjects"
  );
};

// Delete subject
export const deleteSubject = async (subjectId: string) => {
  // Check if subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError("Subject not found");
  }

  // Delete the subject
  await prisma.subject.delete({
    where: { id: subjectId },
  });

  return true;
};
