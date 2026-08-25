CREATE OR ALTER PROCEDURE dbo.usp_Orders_GetById
  @TenantId UNIQUEIDENTIFIER,
  @Id       UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT o.Id, o.OrderNumber, o.CustomerId, c.Name AS CustomerName, o.Status,
         o.Currency, o.Subtotal, o.DiscountTotal, o.TaxTotal, o.ShippingTotal,
         o.GrandTotal, o.Version, o.PlacedAt
  FROM Orders o
  JOIN Customers c ON c.Id = o.CustomerId
  WHERE o.Id = @Id AND o.TenantId = @TenantId;

  -- Second result set (§6.4) — the joined OrderLines. dataSource.query()
  -- only ever surfaces the first recordset, so the repository reaches this
  -- via StoredProcedureRunner.executeMultiple(), the one narrow exception
  -- to the single-result-set contract every other procedure follows.
  SELECT ol.Id, ol.ProductId, ol.ProductName, ol.UnitPrice, ol.Quantity, ol.LineTotal
  FROM OrderLines ol
  JOIN Orders o ON o.Id = ol.OrderId
  WHERE o.Id = @Id AND o.TenantId = @TenantId
  ORDER BY ol.Id;
END
