import { PrismaClient, Prisma } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { 
  Subject, 
  SubjectResponseDto, 
  PaginatedResponse
} from "../models/subject.model";

const prisma = new PrismaClient();

// Helper function to map Subject to SubjectResponseDto
const mapSubjectToResponse = (subject: Subject): SubjectResponseDto => ({
  id: subject.id,
  name: subject.name,
  code: subject.code,
  description: subject.description,
  credits: subject.credits,
  isActive: subject.isActive,
  createdAt: subject.createdAt,
  updatedAt: subject.updatedAt
});

export const subjectService = {
  async getAllSubjects(
    includeInactive = false,
    searchTerm?: string,
    page = 1,
    pageSize = 10,
    filterActive?: boolean
  ): Promise<PaginatedResponse<SubjectResponseDto>> {
    // Convert page and pageSize to numbers
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;

    const whereCondition: Prisma.SubjectWhereInput = {};

    if (filterActive !== undefined) {
      whereCondition.isActive = filterActive;
    } else if (!includeInactive) {
      whereCondition.isActive = true;
    }

    if (searchTerm) {
      whereCondition.OR = [
        { name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const totalItems = await prisma.subject.count({
      where: whereCondition,
    });

    const totalPages = Math.ceil(totalItems / pageSizeNum);

    const subjects = await prisma.subject.findMany({
      where: whereCondition,
      orderBy: { name: "asc" },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });

    return {
      data: subjects.map(mapSubjectToResponse),
      pagination: {
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: pageNum,
        pageSize: pageSizeNum,
      },
    };
  },

  async getSubjectById(subjectId: string): Promise<SubjectResponseDto> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    return mapSubjectToResponse(subject);
  },

  async createSubject(
    name: string,
    code: string,
    description: string = "",
    credits: number = 3,
    isActive: boolean = true
  ): Promise<SubjectResponseDto> {
    const existingSubjectWithName = await prisma.subject.findFirst({
      where: {
        name: {
          equals: name,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    });

    if (existingSubjectWithName) {
      throw new BadRequestError("Subject with this name already exists");
    }

    const existingSubjectWithCode = await prisma.subject.findFirst({
      where: {
        code: {
          equals: code,
          mode: Prisma.QueryMode.insensitive,
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
        credits,
        isActive,
      },
    });

    return mapSubjectToResponse(subject);
  },

  async updateSubject(
    subjectId: string,
    name: string,
    code: string,
    description?: string,
    credits?: number,
    isActive?: boolean
  ): Promise<SubjectResponseDto> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    if (name !== subject.name) {
      const existingSubject = await prisma.subject.findFirst({
        where: {
          name: {
            equals: name,
            mode: Prisma.QueryMode.insensitive,
          },
          id: { not: subjectId },
        },
      });

      if (existingSubject) {
        throw new BadRequestError("Subject with this name already exists");
      }
    }

    if (code !== subject.code) {
      const existingSubjectWithCode = await prisma.subject.findFirst({
        where: {
          code: {
            equals: code,
            mode: Prisma.QueryMode.insensitive,
          },
          id: { not: subjectId },
        },
      });

      if (existingSubjectWithCode) {
        throw new BadRequestError("Subject with this code already exists");
      }
    }

    const updateData: Prisma.SubjectUpdateInput = { name, code };
    if (description !== undefined) updateData.description = description;
    if (credits !== undefined) updateData.credits = credits;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: updateData,
    });

    return mapSubjectToResponse(updatedSubject);
  },

  async updateSubjectStatus(
    subjectId: string,
    isActive: boolean
  ): Promise<SubjectResponseDto> {
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

    return mapSubjectToResponse(updatedSubject);
  },

  async getUserSubjects(userId: string): Promise<SubjectResponseDto[]> {
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

      return studentSubjects.map(item => mapSubjectToResponse(item.subject));
    } else if (user.teacher) {
      const teacherSubjects = await prisma.teachersOnSubjects.findMany({
        where: { teacherId: user.teacher.id },
        include: {
          subject: true,
        },
      });

      return teacherSubjects.map(item => mapSubjectToResponse(item.subject));
    }

    return [];
  },

  async assignSubjectsToUser(
    userId: string,
    subjectIds: string[]
  ): Promise<SubjectResponseDto[]> {
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

    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
    });

    if (subjects.length !== subjectIds.length) {
      throw new BadRequestError("One or more subjects not found");
    }

    const isStudent = !!user.student;
    const userRoleId = isStudent ? user.student!.id : user.teacher!.id;
    const userType = isStudent ? "student" : "teacher";

    // Use the correct Prisma model based on user type
    const existingAssignments = isStudent
      ? await prisma.studentsOnSubjects.findMany({
          where: {
            studentId: userRoleId,
            subjectId: { in: subjectIds },
          },
        })
      : await prisma.teachersOnSubjects.findMany({
          where: {
            teacherId: userRoleId,
            subjectId: { in: subjectIds },
          },
        });

    const newSubjectIds = subjectIds.filter(
      (subjectId) =>
        !existingAssignments.some(
          (assignment: any) => assignment.subjectId === subjectId
        )
    );

    if (newSubjectIds.length === 0) {
      throw new BadRequestError(
        `All subjects are already assigned to this ${userType}`
      );
    }

    // Create new assignments using the correct model
    if (isStudent) {
      await Promise.all(
        newSubjectIds.map((subjectId) =>
          prisma.studentsOnSubjects.create({
            data: {
              studentId: userRoleId,
              subjectId,
            },
          })
        )
      );
    } else {
      await Promise.all(
        newSubjectIds.map((subjectId) =>
          prisma.teachersOnSubjects.create({
            data: {
              teacherId: userRoleId,
              subjectId,
            },
          })
        )
      );
    }

    // Get all subjects using the correct model
    const userSubjects = isStudent
      ? await prisma.studentsOnSubjects.findMany({
          where: { studentId: userRoleId },
          include: {
            subject: true,
          },
        })
      : await prisma.teachersOnSubjects.findMany({
          where: { teacherId: userRoleId },
          include: {
            subject: true,
          },
        });

    return userSubjects.map((item: any) => mapSubjectToResponse(item.subject));
  },

  async assignSubjectToUser(
    userId: string,
    subjectId: string
  ): Promise<SubjectResponseDto[]> {
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

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    if (user.student) {
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

      await prisma.studentsOnSubjects.create({
        data: {
          studentId: user.student.id,
          subjectId: subjectId,
        },
      });

      const studentSubjects = await prisma.studentsOnSubjects.findMany({
        where: { studentId: user.student.id },
        include: {
          subject: true,
        },
      });

      return studentSubjects.map(item => mapSubjectToResponse(item.subject));
    } else if (user.teacher) {
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

      await prisma.teachersOnSubjects.create({
        data: {
          teacherId: user.teacher.id,
          subjectId: subjectId,
        },
      });

      const teacherSubjects = await prisma.teachersOnSubjects.findMany({
        where: { teacherId: user.teacher.id },
        include: {
          subject: true,
        },
      });

      return teacherSubjects.map(item => mapSubjectToResponse(item.subject));
    }

    throw new BadRequestError(
      "User must be a student or teacher to assign subjects"
    );
  },

  async deleteSubject(subjectId: string): Promise<boolean> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    await prisma.subject.delete({
      where: { id: subjectId },
    });

    return true;
  }
};
