CREATE OR ALTER PROCEDURE dbo.usp_Customers_Deactivate
  @TenantId    UNIQUEIDENTIFIER,
  @ActorUserId UNIQUEIDENTIFIER,
  @Id          UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM Customers WHERE Id = @Id AND TenantId = @TenantId)
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  BEGIN TRANSACTION;
    UPDATE Customers SET IsActive = 0 WHERE Id = @Id AND TenantId = @TenantId;

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Customer', @Id, 'DELETE', @ActorUserId);
  COMMIT TRANSACTION;
END
