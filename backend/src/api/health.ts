import { Router } from 'express';
import prisma from '../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    // Try to query Prisma to verify database connection
    let dbStatus = 'unknown';
    let errorMessage = null;

    try {
      // Simple count query to verify connection
      const userCount = await prisma.users.count();
      dbStatus = `connected (${userCount} users)`;
    } catch (dbError: any) {
      errorMessage = dbError.message;
      dbStatus = 'error';
    }

    if (dbStatus === 'error') {
      return res.status(500).json({
        status: 'unhealthy',
        message: 'Database connection failed',
        database: dbStatus,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: 'healthy',
      message: 'All systems operational',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});
