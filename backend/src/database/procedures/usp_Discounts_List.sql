CREATE OR ALTER PROCEDURE dbo.usp_Discounts_List
  @TenantId  UNIQUEIDENTIFIER,
  @Page      INT = 1,
  @PageSize  INT = 20,
  @SortBy    NVARCHAR(30) = 'code',
  @SortDir   NVARCHAR(4)  = 'asc',
  @Search    NVARCHAR(150) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Offset INT = (@Page - 1) * @PageSize;

  SELECT
    Id, Code, Type, Value, StartsAt, EndsAt, UsageLimit, TimesUsed, IsActive,
    COUNT(*) OVER() AS TotalItems
  FROM Discounts
  WHERE TenantId = @TenantId
    AND (@Search IS NULL OR Code LIKE '%' + @Search + '%')
  ORDER BY
    CASE WHEN @SortBy = 'code'   AND @SortDir = 'asc'  THEN Code END ASC,
    CASE WHEN @SortBy = 'code'   AND @SortDir = 'desc' THEN Code END DESC,
    CASE WHEN @SortBy = 'endsAt' AND @SortDir = 'asc'  THEN EndsAt END ASC,
    CASE WHEN @SortBy = 'endsAt' AND @SortDir = 'desc' THEN EndsAt END DESC
  OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
