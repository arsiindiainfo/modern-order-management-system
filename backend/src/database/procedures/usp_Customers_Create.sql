CREATE OR ALTER PROCEDURE dbo.usp_Customers_Create
  @TenantId         UNIQUEIDENTIFIER,
  @ActorUserId      UNIQUEIDENTIFIER,
  @Name             NVARCHAR(150),
  @Email            NVARCHAR(255),
  @Phone            NVARCHAR(30) = NULL,
  @BillingAddress   NVARCHAR(MAX) = NULL,
  @ShippingAddress  NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @Id UNIQUEIDENTIFIER = NEWID();

  BEGIN TRANSACTION;
    INSERT INTO Customers (Id, TenantId, Name, Email, Phone, BillingAddress, ShippingAddress)
    VALUES (@Id, @TenantId, @Name, @Email, @Phone, @BillingAddress, @ShippingAddress);

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Customer', @Id, 'CREATE', @ActorUserId);
  COMMIT TRANSACTION;

  SELECT Id, Name, Email, Phone, BillingAddress, ShippingAddress, IsActive, CreatedAt
  FROM Customers
  WHERE Id = @Id;
END
