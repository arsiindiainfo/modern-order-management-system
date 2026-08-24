import { Injectable } from '@nestjs/common';
import { StoredProcedureRunner } from '../../common/database/stored-procedure-runner.service';
import { UserRole } from '../../common/types/auth-user.interface';

export interface UserWithPasswordHash {
  Id: string;
  TenantId: string;
  FullName: string;
  Email: string;
  PasswordHash: string;
  Role: UserRole;
  IsActive: boolean;
}

export interface RefreshTokenRow {
  Id: string;
  UserId: string;
  TokenHash: string;
  ExpiresAt: string;
  CreatedAt: string;
}

export interface RotatedRefreshTokenRow extends RefreshTokenRow {
  TenantId: string;
  Email: string;
  Role: UserRole;
}

/**
 * The only place outside src/common/database allowed to call
 * StoredProcedureRunner — every other auth concern (hashing, JWT signing,
 * business rules) lives in AuthService.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly runner: StoredProcedureRunner) {}

  async getUserByEmail(
    email: string,
  ): Promise<UserWithPasswordHash | undefined> {
    const rows = await this.runner.execute<UserWithPasswordHash>(
      'usp_Auth_GetUserByEmail',
      [{ name: 'Email', value: email }],
    );
    return rows[0];
  }

  async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshTokenRow> {
    const rows = await this.runner.execute<RefreshTokenRow>(
      'usp_RefreshTokens_Create',
      [
        { name: 'UserId', value: userId, type: 'uniqueidentifier' },
        { name: 'TokenHash', value: tokenHash },
        {
          name: 'ExpiresAt',
          value: expiresAt,
          type: 'datetime2',
          typeParams: [3],
        },
      ],
    );
    return rows[0];
  }

  async rotateRefreshToken(
    oldTokenHash: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<RotatedRefreshTokenRow> {
    const rows = await this.runner.execute<RotatedRefreshTokenRow>(
      'usp_RefreshTokens_Rotate',
      [
        { name: 'OldTokenHash', value: oldTokenHash },
        { name: 'NewTokenHash', value: newTokenHash },
        {
          name: 'NewExpiresAt',
          value: newExpiresAt,
          type: 'datetime2',
          typeParams: [3],
        },
      ],
    );
    return rows[0];
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.runner.execute('usp_RefreshTokens_Revoke', [
      { name: 'TokenHash', value: tokenHash },
    ]);
  }
}
