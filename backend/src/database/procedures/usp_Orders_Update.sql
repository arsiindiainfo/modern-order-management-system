CREATE OR ALTER PROCEDURE dbo.usp_Orders_Update
  @TenantId        UNIQUEIDENTIFIER,
  @ActorUserId     UNIQUEIDENTIFIER,
  @Id              UNIQUEIDENTIFIER,
  @ExpectedVersion INT,
  @CustomerId      UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  -- §17's PUT /orders/:id example payload (shippingAddress) doesn't match
  -- the committed Orders DDL (§6.2) — no such column exists there. The one
  -- plausibly-editable field the real schema has is CustomerId, so that's
  -- what this optimistic-locked update supports for now.
  IF NOT EXISTS (SELECT 1 FROM Orders WHERE Id = @Id AND TenantId = @TenantId)
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  IF NOT EXISTS (SELECT 1 FROM Customers WHERE Id = @CustomerId AND TenantId = @TenantId)
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  BEGIN TRANSACTION;
    UPDATE Orders
    SET CustomerId = @CustomerId, Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @Id AND TenantId = @TenantId AND Version = @ExpectedVersion;

    IF @@ROWCOUNT = 0
    BEGIN
      ROLLBACK TRANSACTION;
      RAISERROR('ORDER_VERSION_CONFLICT', 16, 1);
    END

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Order', @Id, 'UPDATE', @ActorUserId);
  COMMIT TRANSACTION;

  SELECT * FROM Orders WHERE Id = @Id;
END
