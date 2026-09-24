"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const module_1 = require("./module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const document = swagger_1.SwaggerModule.createDocument(app, new swagger_1.DocumentBuilder().setTitle('Rivera API').setVersion('0.1').build());
    if (process.env.NODE_ENV !== 'production')
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map