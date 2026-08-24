import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogTables1787566324329 implements MigrationInterface {
  name = 'CreateCatalogTables1787566324329';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE Customers (
        Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TenantId         UNIQUEIDENTIFIER NOT NULL,
        Name             NVARCHAR(150) NOT NULL,
        Email            NVARCHAR(255) NOT NULL,
        Phone            NVARCHAR(30)  NULL,
        BillingAddress   NVARCHAR(MAX) NULL,
        ShippingAddress  NVARCHAR(MAX) NULL,
        IsActive         BIT NOT NULL DEFAULT 1,
        CreatedAt        DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Customers_TenantId FOREIGN KEY (TenantId) REFERENCES Tenants(Id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IX_Customers_Tenant_Email ON Customers (TenantId, Email)`,
    );

    await queryRunner.query(`
      CREATE TABLE Products (
        Id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TenantId   UNIQUEIDENTIFIER NOT NULL,
        Sku        NVARCHAR(40)  NOT NULL,
        Name       NVARCHAR(200) NOT NULL,
        UnitPrice  DECIMAL(12,2) NOT NULL,
        Currency   CHAR(3) NOT NULL DEFAULT 'USD',
        IsActive   BIT NOT NULL DEFAULT 1,
        CreatedAt  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UX_Products_Tenant_Sku UNIQUE (TenantId, Sku),
        CONSTRAINT FK_Products_TenantId FOREIGN KEY (TenantId) REFERENCES Tenants(Id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE InventoryItems (
        Id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TenantId          UNIQUEIDENTIFIER NOT NULL,
        ProductId         UNIQUEIDENTIFIER NOT NULL,
        QuantityOnHand    INT NOT NULL DEFAULT 0,
        QuantityReserved  INT NOT NULL DEFAULT 0,
        ReorderLevel      INT NOT NULL DEFAULT 0,
        UpdatedAt         DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UX_InventoryItems_ProductId UNIQUE (ProductId),
        CONSTRAINT FK_InventoryItems_TenantId  FOREIGN KEY (TenantId)  REFERENCES Tenants(Id),
        CONSTRAINT FK_InventoryItems_ProductId FOREIGN KEY (ProductId) REFERENCES Products(Id),
        CONSTRAINT CK_InventoryItems_NonNegative CHECK (QuantityOnHand >= 0 AND QuantityReserved >= 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE InventoryItems`);
    await queryRunner.query(`DROP TABLE Products`);
    await queryRunner.query(`DROP TABLE Customers`);
  }
}
