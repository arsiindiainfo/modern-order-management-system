CREATE OR ALTER PROCEDURE dbo.usp_Customers_Update
  @TenantId         UNIQUEIDENTIFIER,
  @Id               UNIQUEIDENTIFIER,
  @Name             NVARCHAR(150),
  @Email            NVARCHAR(255),
  @Phone            NVARCHAR(30) = NULL,
  @BillingAddress   NVARCHAR(MAX) = NULL,
  @ShippingAddress  NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM Customers WHERE Id = @Id AND TenantId = @TenantId)
  BEGIN
    RAISERROR('RESOURCE_NOT_FOUND', 16, 1);
    RETURN;
  END

  UPDATE Customers
  SET Name = @Name,
      Email = @Email,
      Phone = @Phone,
      BillingAddress = @BillingAddress,
      ShippingAddress = @ShippingAddress
  WHERE Id = @Id AND TenantId = @TenantId;

  SELECT Id, Name, Email, Phone, BillingAddress, ShippingAddress, IsActive, CreatedAt
  FROM Customers
  WHERE Id = @Id;
END
