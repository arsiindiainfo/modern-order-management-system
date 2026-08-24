CREATE OR ALTER PROCEDURE dbo.usp_Customers_Create
  @TenantId         UNIQUEIDENTIFIER,
  @Name             NVARCHAR(150),
  @Email            NVARCHAR(255),
  @Phone            NVARCHAR(30) = NULL,
  @BillingAddress   NVARCHAR(MAX) = NULL,
  @ShippingAddress  NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Id UNIQUEIDENTIFIER = NEWID();

  INSERT INTO Customers (Id, TenantId, Name, Email, Phone, BillingAddress, ShippingAddress)
  VALUES (@Id, @TenantId, @Name, @Email, @Phone, @BillingAddress, @ShippingAddress);

  SELECT Id, Name, Email, Phone, BillingAddress, ShippingAddress, IsActive, CreatedAt
  FROM Customers
  WHERE Id = @Id;
END
