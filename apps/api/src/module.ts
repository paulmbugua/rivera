import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';

const env = z.object({ DATABASE_URL: z.string().startsWith('postgresql://'), PORT: z.coerce.number().int().positive().default(4000), WEB_ORIGIN: z.string().url().default('http://localhost:3000') });
@Controller('health')
class HealthController { @Get() health() { return { status: 'ok', service: 'rivera-api' }; } }
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate: (config: Record<string, unknown>) => env.parse(config) })], controllers: [HealthController] })
export class AppModule {}
