CREATE OR ALTER PROCEDURE dbo.usp_Orders_GetHistory
  @TenantId UNIQUEIDENTIFIER,
  @OrderId  UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT h.FromStatus, h.ToStatus, u.FullName AS ChangedByName, h.Note, h.ChangedAt
  FROM OrderStatusHistory h
  JOIN Orders o ON o.Id = h.OrderId
  LEFT JOIN Users u ON u.Id = h.ChangedByUserId
  WHERE h.OrderId = @OrderId AND o.TenantId = @TenantId
  ORDER BY h.ChangedAt ASC;
END
