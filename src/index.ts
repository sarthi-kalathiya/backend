import express from 'express';
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

// Middleware
app.use(express.json());
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Online Exam API is running' });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api', examRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to database successfully');
    
    app.listen(config.app.port, () => {
      console.log(`Server is running on port ${config.app.port}`);
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