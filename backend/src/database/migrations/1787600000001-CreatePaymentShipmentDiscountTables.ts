import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentShipmentDiscountTables1787600000001 implements MigrationInterface {
  name = 'CreatePaymentShipmentDiscountTables1787600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE Payments (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OrderId         UNIQUEIDENTIFIER NOT NULL,
        Provider        NVARCHAR(30)  NOT NULL,
        Amount          DECIMAL(12,2) NOT NULL,
        Currency        CHAR(3) NOT NULL DEFAULT 'USD',
        Status          NVARCHAR(20)  NOT NULL
          CHECK (Status IN ('CAPTURED','DECLINED','REFUNDED')),
        TransactionRef  NVARCHAR(100) NOT NULL,
        PaidAt          DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Payments_OrderId FOREIGN KEY (OrderId) REFERENCES Orders(Id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IX_Payments_OrderId ON Payments (OrderId)`,
    );

    await queryRunner.query(`
      CREATE TABLE Shipments (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OrderId         UNIQUEIDENTIFIER NOT NULL,
        Carrier         NVARCHAR(60)  NOT NULL,
        TrackingNumber  NVARCHAR(80)  NOT NULL,
        Status          NVARCHAR(20)  NOT NULL DEFAULT 'IN_TRANSIT'
          CHECK (Status IN ('IN_TRANSIT','DELIVERED','RETURNED')),
        ShippedAt       DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        DeliveredAt     DATETIME2(3) NULL,
        CONSTRAINT FK_Shipments_OrderId FOREIGN KEY (OrderId) REFERENCES Orders(Id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IX_Shipments_OrderId ON Shipments (OrderId)`,
    );

    await queryRunner.query(`
      CREATE TABLE Discounts (
        Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TenantId     UNIQUEIDENTIFIER NOT NULL,
        Code         NVARCHAR(40) NOT NULL,
        Type         NVARCHAR(10) NOT NULL CHECK (Type IN ('PERCENT','FIXED')),
        Value        DECIMAL(12,2) NOT NULL,
        StartsAt     DATETIME2(3) NOT NULL,
        EndsAt       DATETIME2(3) NOT NULL,
        UsageLimit   INT NULL,
        TimesUsed    INT NOT NULL DEFAULT 0,
        IsActive     BIT NOT NULL DEFAULT 1,
        CONSTRAINT UX_Discounts_Tenant_Code UNIQUE (TenantId, Code),
        CONSTRAINT FK_Discounts_TenantId FOREIGN KEY (TenantId) REFERENCES Tenants(Id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE Discounts`);
    await queryRunner.query(`DROP TABLE Shipments`);
    await queryRunner.query(`DROP TABLE Payments`);
  }
}
