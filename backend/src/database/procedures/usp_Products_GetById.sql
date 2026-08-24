CREATE OR ALTER PROCEDURE dbo.usp_Products_GetById
  @TenantId UNIQUEIDENTIFIER,
  @Id       UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT Id, Sku, Name, UnitPrice, Currency, IsActive, CreatedAt
  FROM Products
  WHERE Id = @Id AND TenantId = @TenantId;
END
