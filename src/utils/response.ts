import { Response } from "express";

export const successResponse = (
  res: Response,
  data: any = null,
  message: string = "Success",
  metadata: any = null,
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    status: "success",
    message,
    data,
    ...metadata,
  });
};

export const createdResponse = (
  res: Response,
  data: any = null,
  message: string = "Resource created successfully"
) => {
  return successResponse(res, data, message, null, 201);
};

export const warningResponse = (
  res: Response,
  data: any = null,
  message: string = "Warning",
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    status: "warning",
    message,
    data,
  });
};

export const noContentResponse = (res: Response) => {
  return res.status(204).end();
};

// ----