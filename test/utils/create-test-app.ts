import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '../../src/app.module'
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter'
import { ThrottlerModule } from '@nestjs/throttler'

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()
    // Override the throttler with a very high limit so it never fires in tests
    // .overrideModule(ThrottlerModule)
    // .useModule(
    //   ThrottlerModule.forRoot({
    //     throttlers: [{ name: 'default', ttl: 60_000, limit: 10_000 }],
    //   }),
    // )
    // .compile()

  const app = moduleRef.createNestApplication()

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.useGlobalFilters(new GlobalExceptionFilter())

  await app.init()
  return app
}