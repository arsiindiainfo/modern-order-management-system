CREATE OR ALTER PROCEDURE dbo.usp_Orders_List
  @TenantId  UNIQUEIDENTIFIER,
  @Page      INT = 1,
  @PageSize  INT = 20,
  @SortBy    NVARCHAR(30) = 'placedAt',
  @SortDir   NVARCHAR(4)  = 'desc',
  @Search    NVARCHAR(150) = NULL,
  @Status    NVARCHAR(20) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Offset INT = (@Page - 1) * @PageSize;

  SELECT
    o.Id, o.OrderNumber, c.Name AS CustomerName, o.Status,
    o.GrandTotal, o.Currency, o.Version, o.PlacedAt,
    COUNT(*) OVER() AS TotalItems
  FROM Orders o
  JOIN Customers c ON c.Id = o.CustomerId
  WHERE o.TenantId = @TenantId
    AND (@Status IS NULL OR o.Status = @Status)
    AND (@Search IS NULL OR o.OrderNumber LIKE '%' + @Search + '%' OR c.Name LIKE '%' + @Search + '%')
  ORDER BY
    CASE WHEN @SortBy = 'orderNumber'  AND @SortDir = 'asc'  THEN o.OrderNumber END ASC,
    CASE WHEN @SortBy = 'orderNumber'  AND @SortDir = 'desc' THEN o.OrderNumber END DESC,
    CASE WHEN @SortBy = 'customerName' AND @SortDir = 'asc'  THEN c.Name END ASC,
    CASE WHEN @SortBy = 'customerName' AND @SortDir = 'desc' THEN c.Name END DESC,
    CASE WHEN @SortBy = 'status'       AND @SortDir = 'asc'  THEN o.Status END ASC,
    CASE WHEN @SortBy = 'status'       AND @SortDir = 'desc' THEN o.Status END DESC,
    CASE WHEN @SortBy = 'grandTotal'   AND @SortDir = 'asc'  THEN o.GrandTotal END ASC,
    CASE WHEN @SortBy = 'grandTotal'   AND @SortDir = 'desc' THEN o.GrandTotal END DESC,
    CASE WHEN @SortBy = 'placedAt'     AND @SortDir = 'asc'  THEN o.PlacedAt END ASC,
    CASE WHEN @SortBy = 'placedAt'     AND @SortDir = 'desc' THEN o.PlacedAt END DESC
  OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
