import { IsUUID } from 'class-validator';

export class AddDependencyDto {
  @IsUUID()
  depends_on_task_id: string;
}
