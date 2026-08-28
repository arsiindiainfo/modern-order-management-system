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

  IF NOT EXISTS (SELECT 1 FROM Orders WHERE Id = @OrderId AND TenantId = @TenantId)
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  DECLARE @FromStatus NVARCHAR(20);
  -- Captures the pre-update status via OUTPUT so the version check and the
  -- legality check both read the SAME atomically-updated row — reading
  -- @FromStatus via a separate SELECT before this UPDATE would let two
  -- concurrent requests targeting the same @ExpectedVersion race: the
  -- loser could see the winner's already-committed new status and get
  -- INVALID_STATE_TRANSITION (422) instead of the intended
  -- ORDER_VERSION_CONFLICT (409).
  DECLARE @UpdatedRows TABLE (FromStatus NVARCHAR(20));

  BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE Orders
    SET Status = @ToStatus, Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
    OUTPUT deleted.Status INTO @UpdatedRows
    WHERE Id = @OrderId AND TenantId = @TenantId AND Version = @ExpectedVersion;

    IF @@ROWCOUNT = 0
    BEGIN
      ROLLBACK TRANSACTION;
      RAISERROR('ORDER_VERSION_CONFLICT', 16, 1);  -- caught by CATCH below, which re-THROWs it
    END

    SELECT @FromStatus = FromStatus FROM @UpdatedRows;

    -- Legality of @FromStatus -> @ToStatus checked here against the same
    -- transition table as the frontend's OrderStateMachine (§8) — kept in
    -- sync by order-state-machine.spec.ts.
    IF NOT EXISTS (SELECT 1 FROM dbo.ufn_LegalOrderTransitions() WHERE FromStatus = @FromStatus AND ToStatus = @ToStatus)
    BEGIN
      ROLLBACK TRANSACTION;
      RAISERROR('INVALID_STATE_TRANSITION', 16, 1);
    END

    -- Cancelling releases any stock this order reserved (§7's "cancel
    -- order" row) — never implicit for hold/resume, only cancellation.
    -- Done after both checks pass, so a version conflict or illegal
    -- transition never touches inventory.
    IF @ToStatus = 'CANCELLED'
    BEGIN
      UPDATE i
      SET i.QuantityReserved = i.QuantityReserved - ol.Quantity
      FROM InventoryItems i
      JOIN OrderLines ol ON ol.ProductId = i.ProductId
      WHERE ol.OrderId = @OrderId;
    END

    INSERT INTO OrderStatusHistory (Id, OrderId, FromStatus, ToStatus, ChangedByUserId, Note)
    VALUES (NEWID(), @OrderId, @FromStatus, @ToStatus, @ActorUserId, @Note);

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Order', @OrderId, 'UPDATE', @ActorUserId);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT * FROM Orders WHERE Id = @OrderId;
END
