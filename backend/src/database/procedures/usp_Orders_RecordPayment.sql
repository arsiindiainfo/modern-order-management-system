CREATE OR ALTER PROCEDURE dbo.usp_Orders_RecordPayment
  @TenantId       UNIQUEIDENTIFIER,
  @ActorUserId    UNIQUEIDENTIFIER,
  @OrderId        UNIQUEIDENTIFIER,
  @Provider       NVARCHAR(30),
  @Amount         DECIMAL(12,2),
  @Currency       CHAR(3),
  @TransactionRef NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @OrderCurrency CHAR(3), @GrandTotal DECIMAL(12,2), @Status NVARCHAR(20), @Version INT;
  SELECT @OrderCurrency = Currency, @GrandTotal = GrandTotal, @Status = Status, @Version = Version
  FROM Orders
  WHERE Id = @OrderId AND TenantId = @TenantId;

  IF @OrderCurrency IS NULL
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  -- No simulated payment-gateway flakiness for this demo — a "decline" is
  -- a real validation failure only (bad amount, currency mismatch), never
  -- a random failure a retry would fix.
  IF @Amount <= 0 OR @Currency <> @OrderCurrency
  BEGIN
    RAISERROR('PAYMENT_FAILED', 16, 1);
    RETURN;
  END

  DECLARE @PaymentId UNIQUEIDENTIFIER = NEWID();

  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO Payments (Id, OrderId, Provider, Amount, Currency, Status, TransactionRef)
    VALUES (@PaymentId, @OrderId, @Provider, @Amount, @Currency, 'CAPTURED', @TransactionRef);

    DECLARE @TotalCaptured DECIMAL(12,2);
    SELECT @TotalCaptured = SUM(Amount) FROM Payments WHERE OrderId = @OrderId AND Status = 'CAPTURED';

    IF @Status = 'PENDING' AND @TotalCaptured >= @GrandTotal
    BEGIN
      UPDATE Orders SET Status = 'CONFIRMED', Version = Version + 1, UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @OrderId AND TenantId = @TenantId;
      SET @Status = 'CONFIRMED';
      SET @Version = @Version + 1;

      INSERT INTO OrderStatusHistory (Id, OrderId, FromStatus, ToStatus, ChangedByUserId, Note)
      VALUES (NEWID(), @OrderId, 'PENDING', 'CONFIRMED', @ActorUserId, 'Payment captured');
    END

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Payment', @PaymentId, 'CREATE', @ActorUserId);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT
    @PaymentId AS PaymentId, 'CAPTURED' AS PaymentStatus,
    @OrderId AS OrderId, @Status AS OrderStatus, @Version AS OrderVersion;
END
