import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ScheduleBlocksRepository } from "./scheduling.repo";
import { ScheduleBlocksQueryService } from "./scheduling.query";

@Module({
  imports: [PrismaModule],
  providers: [
    ScheduleBlocksRepository,
    ScheduleBlocksQueryService,
  ],
  exports: [ScheduleBlocksQueryService],
})
export class ScheduleBlocksQueryModule {}
