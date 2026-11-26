import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AppModule } from './app.module.js';

/**
 * The frontend is a static single-page app served by the API itself: one
 * process, one port, no CORS. FRONTEND_DIR overrides the default location
 * (../frontend relative to the backend folder).
 */
function frontendDirectory(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return process.env.FRONTEND_DIR ?? path.resolve(here, '..', '..', 'frontend');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();

  const frontend = frontendDirectory();
  if (existsSync(frontend)) {
    app.useStaticAssets(frontend, { index: 'index.html', maxAge: '1h' });
    Logger.log(`Serving frontend from ${frontend}`, 'Bootstrap');
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Ciso Excursões running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
