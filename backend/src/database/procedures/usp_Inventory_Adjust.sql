CREATE OR ALTER PROCEDURE dbo.usp_Inventory_Adjust
  @TenantId       UNIQUEIDENTIFIER,
  @ProductId      UNIQUEIDENTIFIER,
  @QuantityDelta  INT,
  @Reason         NVARCHAR(300)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @CurrentOnHand INT;
  SELECT @CurrentOnHand = i.QuantityOnHand
  FROM InventoryItems i
  JOIN Products p ON p.Id = i.ProductId
  WHERE i.ProductId = @ProductId AND p.TenantId = @TenantId;

  IF @CurrentOnHand IS NULL
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  IF @CurrentOnHand + @QuantityDelta < 0
  BEGIN
    RAISERROR('INSUFFICIENT_STOCK', 16, 1);
    RETURN;
  END

  UPDATE InventoryItems
  SET QuantityOnHand = QuantityOnHand + @QuantityDelta,
      UpdatedAt = SYSUTCDATETIME()
  WHERE ProductId = @ProductId;

  SELECT
    p.Id AS ProductId,
    p.Sku,
    i.QuantityOnHand,
    i.QuantityReserved,
    (i.QuantityOnHand - i.QuantityReserved) AS QuantityAvailable,
    i.ReorderLevel
  FROM Products p
  JOIN InventoryItems i ON i.ProductId = p.Id
  WHERE p.Id = @ProductId;
END
