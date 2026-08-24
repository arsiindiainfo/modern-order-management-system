CREATE OR ALTER PROCEDURE dbo.usp_Customers_Deactivate
  @TenantId UNIQUEIDENTIFIER,
  @Id       UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM Customers WHERE Id = @Id AND TenantId = @TenantId)
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  UPDATE Customers SET IsActive = 0 WHERE Id = @Id AND TenantId = @TenantId;
END
