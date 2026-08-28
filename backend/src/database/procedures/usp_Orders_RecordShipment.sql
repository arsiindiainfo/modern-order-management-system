CREATE OR ALTER PROCEDURE dbo.usp_Orders_RecordShipment
  @TenantId        UNIQUEIDENTIFIER,
  @ActorUserId     UNIQUEIDENTIFIER,
  @OrderId         UNIQUEIDENTIFIER,
  @ExpectedVersion INT,
  @Carrier         NVARCHAR(60),
  @TrackingNumber  NVARCHAR(80)
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
  -- Same atomic-OUTPUT technique as usp_Orders_UpdateStatus: the version
  -- check and the legality check must read the SAME updated row, or a
  -- race loser could see the winner's already-committed status and get
  -- INVALID_STATE_TRANSITION instead of ORDER_VERSION_CONFLICT.
  DECLARE @UpdatedRows TABLE (FromStatus NVARCHAR(20));
  DECLARE @ShipmentId UNIQUEIDENTIFIER = NEWID();

  BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE Orders
    SET Status = 'SHIPPED', Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
    OUTPUT deleted.Status INTO @UpdatedRows
    WHERE Id = @OrderId AND TenantId = @TenantId AND Version = @ExpectedVersion;

    IF @@ROWCOUNT = 0
    BEGIN
      ROLLBACK TRANSACTION;
      RAISERROR('ORDER_VERSION_CONFLICT', 16, 1);
    END

    SELECT @FromStatus = FromStatus FROM @UpdatedRows;

    IF NOT EXISTS (SELECT 1 FROM dbo.ufn_LegalOrderTransitions() WHERE FromStatus = @FromStatus AND ToStatus = 'SHIPPED')
    BEGIN
      ROLLBACK TRANSACTION;
      RAISERROR('INVALID_STATE_TRANSITION', 16, 1);
    END

    -- the goods have physically left the building: release the reservation
    -- and decrement on-hand for every line, one transaction.
    UPDATE i
    SET i.QuantityReserved = i.QuantityReserved - ol.Quantity,
        i.QuantityOnHand   = i.QuantityOnHand - ol.Quantity,
        i.UpdatedAt        = SYSUTCDATETIME()
    FROM InventoryItems i
    JOIN OrderLines ol ON ol.ProductId = i.ProductId
    WHERE ol.OrderId = @OrderId;

    INSERT INTO Shipments (Id, OrderId, Carrier, TrackingNumber)
    VALUES (@ShipmentId, @OrderId, @Carrier, @TrackingNumber);

    INSERT INTO OrderStatusHistory (Id, OrderId, FromStatus, ToStatus, ChangedByUserId, Note)
    VALUES (NEWID(), @OrderId, @FromStatus, 'SHIPPED', @ActorUserId, CONCAT('Shipped via ', @Carrier, ' (', @TrackingNumber, ')'));

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Shipment', @ShipmentId, 'CREATE', @ActorUserId);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT
    @ShipmentId AS ShipmentId, @Carrier AS Carrier, @TrackingNumber AS TrackingNumber,
    o.Id AS OrderId, o.Status AS OrderStatus, o.Version AS OrderVersion
  FROM Orders o
  WHERE o.Id = @OrderId;
END
