CREATE OR ALTER PROCEDURE dbo.usp_Products_Update
  @TenantId   UNIQUEIDENTIFIER,
  @Id         UNIQUEIDENTIFIER,
  @Name       NVARCHAR(200),
  @UnitPrice  DECIMAL(12,2),
  @Currency   CHAR(3)
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM Products WHERE Id = @Id AND TenantId = @TenantId)
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  UPDATE Products
  SET Name = @Name,
      UnitPrice = @UnitPrice,
      Currency = @Currency
  WHERE Id = @Id AND TenantId = @TenantId;

  SELECT Id, Sku, Name, UnitPrice, Currency, IsActive, CreatedAt
  FROM Products
  WHERE Id = @Id;
END
