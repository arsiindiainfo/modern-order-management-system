CREATE OR ALTER PROCEDURE dbo.usp_Customers_GetById
  @TenantId UNIQUEIDENTIFIER,
  @Id       UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT Id, Name, Email, Phone, BillingAddress, ShippingAddress, IsActive, CreatedAt
  FROM Customers
  WHERE Id = @Id AND TenantId = @TenantId;
END
