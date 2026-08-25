CREATE OR ALTER PROCEDURE dbo.usp_Orders_Create
  @TenantId    UNIQUEIDENTIFIER,
  @ActorUserId UNIQUEIDENTIFIER,
  @CustomerId  UNIQUEIDENTIFIER,
  @Lines       dbo.OrderLineInput READONLY   -- table-valued param: ProductId, Quantity
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. lock and validate stock for every line before writing anything
    IF EXISTS (
      SELECT 1 FROM @Lines l
      JOIN InventoryItems i WITH (UPDLOCK, HOLDLOCK) ON i.ProductId = l.ProductId
      WHERE (i.QuantityOnHand - i.QuantityReserved) < l.Quantity
    )
    BEGIN
      RAISERROR('INSUFFICIENT_STOCK', 16, 1);
    END

    -- 2. reserve stock
    UPDATE i SET i.QuantityReserved = i.QuantityReserved + l.Quantity
    FROM InventoryItems i JOIN @Lines l ON l.ProductId = i.ProductId;

    -- 3. allocate the next order number atomically, per tenant per year.
    -- Not a scalar function (dbo.ufn_NextOrderNumber, as sketched in the
    -- plan's Pattern B) — SQL Server scalar functions cannot perform DML,
    -- so the atomic counter upsert is inlined here, its only caller.
    DECLARE @Year INT = YEAR(SYSUTCDATETIME());
    DECLARE @NextNumber INT;

    IF NOT EXISTS (SELECT 1 FROM OrderNumberCounters WHERE TenantId = @TenantId AND Year = @Year)
      INSERT INTO OrderNumberCounters (TenantId, Year, LastNumber) VALUES (@TenantId, @Year, 0);

    UPDATE OrderNumberCounters
    SET LastNumber = LastNumber + 1,
        @NextNumber = LastNumber + 1
    WHERE TenantId = @TenantId AND Year = @Year;

    DECLARE @OrderNumber NVARCHAR(20) =
      'ORD-' + CAST(@Year AS NVARCHAR(4)) + '-' + RIGHT('000000' + CAST(@NextNumber AS NVARCHAR(6)), 6);

    -- 4. insert order header + lines. No discount/tax/shipping resolution
    -- yet (Discounts don't exist until Phase 4) — GrandTotal = Subtotal.
    DECLARE @OrderId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Subtotal DECIMAL(12,2);
    SELECT @Subtotal = SUM(p.UnitPrice * l.Quantity)
    FROM @Lines l JOIN Products p ON p.Id = l.ProductId;

    INSERT INTO Orders (Id, TenantId, OrderNumber, CustomerId, Status, Subtotal, DiscountTotal, TaxTotal, ShippingTotal, GrandTotal)
    VALUES (@OrderId, @TenantId, @OrderNumber, @CustomerId, 'PENDING', @Subtotal, 0, 0, 0, @Subtotal);

    INSERT INTO OrderLines (Id, OrderId, ProductId, ProductName, UnitPrice, Quantity, LineTotal)
    SELECT NEWID(), @OrderId, p.Id, p.Name, p.UnitPrice, l.Quantity, p.UnitPrice * l.Quantity
    FROM @Lines l JOIN Products p ON p.Id = l.ProductId;

    -- 5. first history row + audit row, same transaction
    INSERT INTO OrderStatusHistory (Id, OrderId, FromStatus, ToStatus, ChangedByUserId)
    VALUES (NEWID(), @OrderId, NULL, 'PENDING', @ActorUserId);

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Order', @OrderId, 'CREATE', @ActorUserId);

    COMMIT TRANSACTION;

    SELECT * FROM Orders WHERE Id = @OrderId;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END
