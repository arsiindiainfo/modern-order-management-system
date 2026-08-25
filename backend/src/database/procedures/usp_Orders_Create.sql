CREATE OR ALTER PROCEDURE dbo.usp_Orders_Create
  @TenantId     UNIQUEIDENTIFIER,
  @ActorUserId  UNIQUEIDENTIFIER,
  @CustomerId   UNIQUEIDENTIFIER,
  @DiscountCode NVARCHAR(40) = NULL,
  @Lines        dbo.OrderLineInput READONLY   -- table-valued param: ProductId, Quantity
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

    -- 4. insert order header + lines. Still no tax/shipping resolution
    -- (nothing in the schema models either) — GrandTotal = Subtotal - DiscountTotal.
    DECLARE @OrderId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Subtotal DECIMAL(12,2);
    SELECT @Subtotal = SUM(p.UnitPrice * l.Quantity)
    FROM @Lines l JOIN Products p ON p.Id = l.ProductId;

    -- Re-validate the discount server-side — the same checks
    -- usp_Discounts_Validate makes — never trust a client-supplied amount.
    DECLARE @DiscountId UNIQUEIDENTIFIER = NULL;
    DECLARE @DiscountTotal DECIMAL(12,2) = 0;

    IF @DiscountCode IS NOT NULL
    BEGIN
      DECLARE @DType NVARCHAR(10), @DValue DECIMAL(12,2), @DIsActive BIT,
              @DStartsAt DATETIME2(3), @DEndsAt DATETIME2(3), @DUsageLimit INT, @DTimesUsed INT;

      SELECT @DiscountId = Id, @DType = Type, @DValue = Value, @DIsActive = IsActive,
             @DStartsAt = StartsAt, @DEndsAt = EndsAt, @DUsageLimit = UsageLimit, @DTimesUsed = TimesUsed
      FROM Discounts WITH (UPDLOCK, HOLDLOCK)
      WHERE TenantId = @TenantId AND Code = @DiscountCode;

      IF @DiscountId IS NULL OR @DIsActive = 0
         OR SYSUTCDATETIME() < @DStartsAt OR SYSUTCDATETIME() > @DEndsAt
         OR (@DUsageLimit IS NOT NULL AND @DTimesUsed >= @DUsageLimit)
      BEGIN
        RAISERROR('DISCOUNT_NOT_APPLICABLE', 16, 1);
      END

      SET @DiscountTotal = dbo.ufn_ComputeDiscountAmount(@DType, @DValue, @Subtotal);
      UPDATE Discounts SET TimesUsed = TimesUsed + 1 WHERE Id = @DiscountId;
    END

    INSERT INTO Orders (Id, TenantId, OrderNumber, CustomerId, Status, Subtotal, DiscountTotal, TaxTotal, ShippingTotal, GrandTotal)
    VALUES (@OrderId, @TenantId, @OrderNumber, @CustomerId, 'PENDING', @Subtotal, @DiscountTotal, 0, 0, @Subtotal - @DiscountTotal);

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
