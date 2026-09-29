import { Injectable } from "@nestjs/common"
import { ScheduleBlocksRepository } from "./scheduling.repo"

@Injectable()
export class ScheduleBlocksQueryService {
  constructor(private readonly repo: ScheduleBlocksRepository) {}

  // Helper: Check if a task has any associated schedule blocks
  async taskHasScheduleBlocks(taskId: string): Promise<boolean> {
    const count = await this.repo.countByTaskId(taskId)
    return count > 0
  }
}
