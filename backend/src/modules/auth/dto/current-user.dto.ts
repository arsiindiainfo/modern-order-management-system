import { ApiProperty } from '@nestjs/swagger';
import type { UserRole } from '../../../common/types/auth-user.interface';

export class CurrentUserDto {
  @ApiProperty({ example: '6f1a2e10-9c3d-4b7a-8e2f-1a2b3c4d5e6f' })
  id!: string;

  @ApiProperty({ example: 'Priya Shah' })
  fullName!: string;

  @ApiProperty({ example: 'manager@acme-demo.com' })
  email!: string;

  @ApiProperty({ example: 'MANAGER' })
  role!: UserRole;

  @ApiProperty({ example: '13c1147b-b6e1-4eaa-8921-34c24469f172' })
  tenantId!: string;
}
