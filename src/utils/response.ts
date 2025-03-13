import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

export const createdResponse = (
  res: Response,
  data: any = null,
  message: string = 'Resource created successfully'
) => {
  return successResponse(res, data, message, 201);
};

export const noContentResponse = (
  res: Response
) => {
  return res.status(204).end();
}; 