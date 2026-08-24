CREATE OR ALTER PROCEDURE dbo.usp_Products_GetInventory
  @TenantId  UNIQUEIDENTIFIER,
  @ProductId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    p.Id AS ProductId,
    p.Sku,
    i.QuantityOnHand,
    i.QuantityReserved,
    (i.QuantityOnHand - i.QuantityReserved) AS QuantityAvailable,
    i.ReorderLevel
  FROM Products p
  JOIN InventoryItems i ON i.ProductId = p.Id
  WHERE p.Id = @ProductId AND p.TenantId = @TenantId;
END
