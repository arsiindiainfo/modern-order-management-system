import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantUserRefreshToken1787552985695 implements MigrationInterface {
  name = 'CreateTenantUserRefreshToken1787552985695';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE Tenants (
        Id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        Name       NVARCHAR(150) NOT NULL,
        Slug       NVARCHAR(80)  NOT NULL,
        PlanTier   NVARCHAR(20)  NOT NULL DEFAULT 'TRIAL'
          CHECK (PlanTier IN ('TRIAL','STANDARD','PRO')),
        IsActive   BIT NOT NULL DEFAULT 1,
        CreatedAt  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UX_Tenants_Slug UNIQUE (Slug)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE Users (
        Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TenantId      UNIQUEIDENTIFIER NOT NULL,
        FullName      NVARCHAR(150) NOT NULL,
        Email         NVARCHAR(255) NOT NULL,
        PasswordHash  NVARCHAR(255) NOT NULL,
        Role          NVARCHAR(20)  NOT NULL
          CHECK (Role IN ('SUPER_ADMIN','TENANT_ADMIN','MANAGER','STAFF')),
        IsActive      BIT NOT NULL DEFAULT 1,
        LastLoginAt   DATETIME2(3) NULL,
        CreatedAt     DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UX_Users_Tenant_Email UNIQUE (TenantId, Email),
        CONSTRAINT FK_Users_TenantId FOREIGN KEY (TenantId) REFERENCES Tenants(Id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE RefreshTokens (
        Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        UserId      UNIQUEIDENTIFIER NOT NULL,
        TokenHash   NVARCHAR(255) NOT NULL,
        ExpiresAt   DATETIME2(3) NOT NULL,
        RevokedAt   DATETIME2(3) NULL,
        CreatedAt   DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_RefreshTokens_UserId FOREIGN KEY (UserId) REFERENCES Users(Id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IX_RefreshTokens_TokenHash ON RefreshTokens (TokenHash)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE RefreshTokens`);
    await queryRunner.query(`DROP TABLE Users`);
    await queryRunner.query(`DROP TABLE Tenants`);
  }
}
