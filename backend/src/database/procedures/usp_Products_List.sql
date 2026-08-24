CREATE OR ALTER PROCEDURE dbo.usp_Products_List
  @TenantId  UNIQUEIDENTIFIER,
  @Page      INT = 1,
  @PageSize  INT = 20,
  @SortBy    NVARCHAR(30) = 'createdAt',
  @SortDir   NVARCHAR(4)  = 'desc',
  @Search    NVARCHAR(150) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Offset INT = (@Page - 1) * @PageSize;

  SELECT
    Id, Sku, Name, UnitPrice, Currency, IsActive, CreatedAt,
    COUNT(*) OVER() AS TotalItems
  FROM Products
  WHERE TenantId = @TenantId
    AND (@Search IS NULL OR Name LIKE '%' + @Search + '%' OR Sku LIKE '%' + @Search + '%')
  ORDER BY
    CASE WHEN @SortBy = 'name'      AND @SortDir = 'asc'  THEN Name END ASC,
    CASE WHEN @SortBy = 'name'      AND @SortDir = 'desc' THEN Name END DESC,
    CASE WHEN @SortBy = 'sku'       AND @SortDir = 'asc'  THEN Sku END ASC,
    CASE WHEN @SortBy = 'sku'       AND @SortDir = 'desc' THEN Sku END DESC,
    CASE WHEN @SortBy = 'unitPrice' AND @SortDir = 'asc'  THEN UnitPrice END ASC,
    CASE WHEN @SortBy = 'unitPrice' AND @SortDir = 'desc' THEN UnitPrice END DESC,
    CASE WHEN @SortBy = 'createdAt' AND @SortDir = 'asc'  THEN CreatedAt END ASC,
    CASE WHEN @SortBy = 'createdAt' AND @SortDir = 'desc' THEN CreatedAt END DESC
  OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
