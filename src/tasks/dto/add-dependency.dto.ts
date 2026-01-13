import { IsUUID } from 'class-validator';

export class AddDependencyDto {
  @IsUUID()
  dependsOnTaskId: string;
}
