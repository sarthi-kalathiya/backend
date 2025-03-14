import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config';
import prisma from './utils/prismaClient';
import { errorHandler, notFound } from './middlewares/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import subjectRoutes from './routes/subject.routes';
import examRoutes from './routes/exam.routes';

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(express.json());

// Custom error handler for JSON parsing errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid JSON format in request body',
      details: err.message
    });
  }
  next(err);
});

app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Online Exam API is running' });
});

// Register routes with clear logging
console.log('Registering routes:');
console.log(' - /api/auth: Authentication routes');
app.use('/api/auth', authRoutes);

console.log(' - /api/user: User profile and management routes');
app.use('/api/user', userRoutes);

console.log(' - /api/subjects: Subject management routes');
app.use('/api/subjects', subjectRoutes);

console.log(' - /api/teacher: Teacher exam management routes');
app.use('/api/teacher', examRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to database successfully');
    
    app.listen(config.app.port, () => {
      console.log(`Server is running on port ${config.app.port}`);
      console.log(`API available at: http://localhost:${config.app.port}/api`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 