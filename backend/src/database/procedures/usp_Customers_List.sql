CREATE OR ALTER PROCEDURE dbo.usp_Customers_List
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
    Id, Name, Email, Phone, BillingAddress, ShippingAddress, IsActive, CreatedAt,
    COUNT(*) OVER() AS TotalItems
  FROM Customers
  WHERE TenantId = @TenantId
    AND (@Search IS NULL OR Name LIKE '%' + @Search + '%' OR Email LIKE '%' + @Search + '%')
  ORDER BY
    CASE WHEN @SortBy = 'name'      AND @SortDir = 'asc'  THEN Name END ASC,
    CASE WHEN @SortBy = 'name'      AND @SortDir = 'desc' THEN Name END DESC,
    CASE WHEN @SortBy = 'email'     AND @SortDir = 'asc'  THEN Email END ASC,
    CASE WHEN @SortBy = 'email'     AND @SortDir = 'desc' THEN Email END DESC,
    CASE WHEN @SortBy = 'createdAt' AND @SortDir = 'asc'  THEN CreatedAt END ASC,
    CASE WHEN @SortBy = 'createdAt' AND @SortDir = 'desc' THEN CreatedAt END DESC
  OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
