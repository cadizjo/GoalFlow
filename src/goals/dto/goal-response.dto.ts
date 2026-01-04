import { GoalStatus } from '@prisma/client';

export class GoalResponseDto {
  id: string;
  title: string;
  description?: string;
  deadline: Date;
  category?: string;
  status: GoalStatus;
  created_at: Date;
  updated_at: Date;
}
