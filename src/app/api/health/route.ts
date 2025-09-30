import logger from '@/lib/logger';

export async function GET() {
  const startTime = Date.now();

  try {
    // Basic system health checks
    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV || "development",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100,
      },
      responseTime: Date.now() - startTime,
      checks: {
        database: "N/A", // Update if you add database connectivity
        api: "healthy",
        memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? "healthy" : "warning",
      },
    };

    logger.info('Health check completed', {
      responseTime: healthCheck.responseTime,
      memoryUsage: healthCheck.memory.used,
      type: 'health_check',
    });

    return Response.json(healthCheck, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
      type: 'health_check_error',
    });

    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
