CREATE OR ALTER PROCEDURE dbo.usp_Orders_UpdateStatus
  @TenantId        UNIQUEIDENTIFIER,
  @ActorUserId     UNIQUEIDENTIFIER,
  @OrderId         UNIQUEIDENTIFIER,
  @ExpectedVersion INT,
  @ToStatus        NVARCHAR(20),
  @Note            NVARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @FromStatus NVARCHAR(20);
  SELECT @FromStatus = Status FROM Orders WHERE Id = @OrderId AND TenantId = @TenantId;

  IF @FromStatus IS NULL
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  -- Legality of @FromStatus -> @ToStatus checked here against the same
  -- transition table as the frontend's OrderStateMachine (§8) — kept in
  -- sync by order-state-machine.spec.ts.
  IF NOT EXISTS (SELECT 1 FROM dbo.ufn_LegalOrderTransitions() WHERE FromStatus = @FromStatus AND ToStatus = @ToStatus)
  BEGIN
    RAISERROR('INVALID_STATE_TRANSITION', 16, 1);
    RETURN;
  END

  BEGIN TRY
    BEGIN TRANSACTION;

    -- Cancelling releases any stock this order reserved (§7's "cancel
    -- order" row) — never implicit for hold/resume, only cancellation.
    IF @ToStatus = 'CANCELLED'
    BEGIN
      UPDATE i
      SET i.QuantityReserved = i.QuantityReserved - ol.Quantity
      FROM InventoryItems i
      JOIN OrderLines ol ON ol.ProductId = i.ProductId
      WHERE ol.OrderId = @OrderId;
    END

    UPDATE Orders
    SET Status = @ToStatus, Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @OrderId AND TenantId = @TenantId AND Version = @ExpectedVersion;

    IF @@ROWCOUNT = 0
    BEGIN
      ROLLBACK TRANSACTION;
      RAISERROR('ORDER_VERSION_CONFLICT', 16, 1);  -- caught by CATCH below, which re-THROWs it
    END

    INSERT INTO OrderStatusHistory (Id, OrderId, FromStatus, ToStatus, ChangedByUserId, Note)
    VALUES (NEWID(), @OrderId, @FromStatus, @ToStatus, @ActorUserId, @Note);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT * FROM Orders WHERE Id = @OrderId;
END
