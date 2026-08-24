CREATE OR ALTER PROCEDURE dbo.usp_Products_Create
  @TenantId      UNIQUEIDENTIFIER,
  @Sku           NVARCHAR(40),
  @Name          NVARCHAR(200),
  @UnitPrice     DECIMAL(12,2),
  @Currency      CHAR(3) = 'USD',
  @InitialStock  INT = 0,
  @ReorderLevel  INT = 0
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF EXISTS (SELECT 1 FROM Products WHERE TenantId = @TenantId AND Sku = @Sku)
  BEGIN
    RAISERROR('DUPLICATE_ENTRY', 16, 1);
    RETURN;
  END

  DECLARE @Id UNIQUEIDENTIFIER = NEWID();

  BEGIN TRANSACTION;
    INSERT INTO Products (Id, TenantId, Sku, Name, UnitPrice, Currency)
    VALUES (@Id, @TenantId, @Sku, @Name, @UnitPrice, @Currency);

    -- Every product carries exactly one InventoryItems row (1:1, enforced
    -- by UX_InventoryItems_ProductId) — created here so GetInventory/Adjust
    -- always have a row to work against.
    INSERT INTO InventoryItems (Id, TenantId, ProductId, QuantityOnHand, ReorderLevel)
    VALUES (NEWID(), @TenantId, @Id, @InitialStock, @ReorderLevel);
  COMMIT TRANSACTION;

  SELECT Id, Sku, Name, UnitPrice, Currency, IsActive, CreatedAt
  FROM Products
  WHERE Id = @Id;
END
