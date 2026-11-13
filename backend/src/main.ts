import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule, ObserveInstrument } from "./app.module.js";
import { ApiExceptionFilter, validationException } from "./common/filters/api-exception.filter.js";
import type { Env } from "./config/env.config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationException,
    }),
  );
  // Every failed request leaves as the error envelope of @pms/shared-types.
  app.useGlobalFilters(new ApiExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("PMS")
    .setDescription("Performance Management System API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("swagger", app, document);

  const env = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(env.get("PORT", { infer: true }));
}
await bootstrap();
