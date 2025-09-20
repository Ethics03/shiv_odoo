import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    });

    const config = new DocumentBuilder()
      .setTitle('SHIV Furnitures API')
      .setDescription('TriNetra API')
      .setVersion('1.0')
      .addTag('TriNetra')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);

    const port = process.env.PORT ?? 3001;
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}
bootstrap();
