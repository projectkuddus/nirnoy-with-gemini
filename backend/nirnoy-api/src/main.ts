import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security headers
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  }
  
  // Enable CORS for frontend - production ready
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002', 
    'http://localhost:5173',  // Vite dev server
    'https://nirnoy.ai',
    'https://www.nirnoy.ai',
    'https://nirnoy-with-gemini.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  
  console.log(`
🚀 Nirnoy API Server running on port ${port}
📚 API endpoints available at /api
🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
}
bootstrap();
