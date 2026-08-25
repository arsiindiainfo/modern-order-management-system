import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderTables1787580011234 implements MigrationInterface {
  name = 'CreateOrderTables1787580011234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE Orders (
        Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TenantId         UNIQUEIDENTIFIER NOT NULL,
        OrderNumber      NVARCHAR(20)   NOT NULL,
        CustomerId       UNIQUEIDENTIFIER NOT NULL,
        Status           NVARCHAR(20)   NOT NULL DEFAULT 'PENDING'
          CHECK (Status IN ('PENDING','CONFIRMED','PROCESSING',
                           'ON_HOLD','SHIPPED','DELIVERED','CANCELLED')),
        Currency         CHAR(3)        NOT NULL DEFAULT 'USD',
        Subtotal         DECIMAL(12,2)  NOT NULL DEFAULT 0,
        DiscountTotal    DECIMAL(12,2)  NOT NULL DEFAULT 0,
        TaxTotal         DECIMAL(12,2)  NOT NULL DEFAULT 0,
        ShippingTotal    DECIMAL(12,2)  NOT NULL DEFAULT 0,
        GrandTotal       DECIMAL(12,2)  NOT NULL DEFAULT 0,
        Version          INT            NOT NULL DEFAULT 1,
        PlacedAt         DATETIME2(3)   NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedAt        DATETIME2(3)   NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt        DATETIME2(3)   NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UX_Orders_TenantId_OrderNumber UNIQUE (TenantId, OrderNumber),
        CONSTRAINT FK_Orders_TenantId   FOREIGN KEY (TenantId)   REFERENCES Tenants(Id),
        CONSTRAINT FK_Orders_CustomerId FOREIGN KEY (CustomerId) REFERENCES Customers(Id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IX_Orders_Tenant_Status ON Orders (TenantId, Status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IX_Orders_Tenant_Customer ON Orders (TenantId, CustomerId)`,
    );

    await queryRunner.query(`
      CREATE TABLE OrderLines (
        Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OrderId      UNIQUEIDENTIFIER NOT NULL,
        ProductId    UNIQUEIDENTIFIER NOT NULL,
        ProductName  NVARCHAR(200) NOT NULL,
        UnitPrice    DECIMAL(12,2) NOT NULL,
        Quantity     INT NOT NULL CHECK (Quantity > 0),
        LineTotal    DECIMAL(12,2) NOT NULL,
        CONSTRAINT FK_OrderLines_OrderId   FOREIGN KEY (OrderId)   REFERENCES Orders(Id) ON DELETE CASCADE,
        CONSTRAINT FK_OrderLines_ProductId FOREIGN KEY (ProductId) REFERENCES Products(Id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IX_OrderLines_OrderId ON OrderLines (OrderId)`,
    );

    await queryRunner.query(`
      CREATE TABLE OrderStatusHistory (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OrderId         UNIQUEIDENTIFIER NOT NULL,
        FromStatus      NVARCHAR(20) NULL,
        ToStatus        NVARCHAR(20) NOT NULL,
        ChangedByUserId UNIQUEIDENTIFIER NULL,
        Note            NVARCHAR(500) NULL,
        ChangedAt       DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_OrderStatusHistory_OrderId FOREIGN KEY (OrderId) REFERENCES Orders(Id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IX_OrderStatusHistory_OrderId ON OrderStatusHistory (OrderId, ChangedAt)`,
    );

    // §6.2's cross-entity audit trail — usp_Orders_Create (Pattern B, §6.3)
    // writes to it, but it never existed yet (a Phase 2 gap: usp_Inventory_Adjust
    // was documented to write here too but doesn't). Created now since Orders
    // Create genuinely needs it; not retrofitting Phase 2's procedures or
    // building the /api/audit read endpoint here — out of this phase's scope.
    await queryRunner.query(`
      CREATE TABLE AuditLogs (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TenantId        UNIQUEIDENTIFIER NOT NULL,
        EntityName      NVARCHAR(60)  NOT NULL,
        EntityId        UNIQUEIDENTIFIER NOT NULL,
        Action          NVARCHAR(20)  NOT NULL CHECK (Action IN ('CREATE','UPDATE','DELETE')),
        ChangedByUserId UNIQUEIDENTIFIER NOT NULL,
        ChangedAt       DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_AuditLogs_TenantId FOREIGN KEY (TenantId) REFERENCES Tenants(Id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IX_AuditLogs_Tenant_Entity ON AuditLogs (TenantId, EntityName, EntityId)`,
    );

    // Internal counter state backing dbo.ufn_NextOrderNumber — not part of
    // the plan's public §6.1 table list, never surfaced through any DTO.
    // An atomic UPDATE...OUTPUT upsert against this avoids the race a plain
    // MAX(OrderNumber)+1 scalar function would have under concurrent creates.
    await queryRunner.query(`
      CREATE TABLE OrderNumberCounters (
        TenantId   UNIQUEIDENTIFIER NOT NULL,
        Year       INT NOT NULL,
        LastNumber INT NOT NULL DEFAULT 0,
        CONSTRAINT PK_OrderNumberCounters PRIMARY KEY (TenantId, Year)
      )
    `);

    // The Pattern B (§6.3) table-valued parameter for usp_Orders_Create's @Lines.
    await queryRunner.query(`
      CREATE TYPE dbo.OrderLineInput AS TABLE (
        ProductId UNIQUEIDENTIFIER NOT NULL,
        Quantity  INT NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS dbo.OrderLineInput`);
    await queryRunner.query(`DROP TABLE OrderNumberCounters`);
    await queryRunner.query(`DROP TABLE AuditLogs`);
    await queryRunner.query(`DROP TABLE OrderStatusHistory`);
    await queryRunner.query(`DROP TABLE OrderLines`);
    await queryRunner.query(`DROP TABLE Orders`);
  }
}
