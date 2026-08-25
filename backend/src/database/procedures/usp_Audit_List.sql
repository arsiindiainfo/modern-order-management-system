CREATE OR ALTER PROCEDURE dbo.usp_Audit_List
  @TenantId   UNIQUEIDENTIFIER,
  @Page       INT = 1,
  @PageSize   INT = 20,
  @SortBy     NVARCHAR(30) = 'changedAt',
  @SortDir    NVARCHAR(4)  = 'desc',
  @EntityName NVARCHAR(60) = NULL,
  @EntityId   UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Offset INT = (@Page - 1) * @PageSize;

  -- §10/§11.4: minimal fields only — no raw before/after payload.
  SELECT
    a.EntityName, a.EntityId, a.Action, u.FullName AS ChangedByName, a.ChangedAt,
    COUNT(*) OVER() AS TotalItems
  FROM AuditLogs a
  LEFT JOIN Users u ON u.Id = a.ChangedByUserId
  WHERE a.TenantId = @TenantId
    AND (@EntityName IS NULL OR a.EntityName = @EntityName)
    AND (@EntityId IS NULL OR a.EntityId = @EntityId)
  ORDER BY
    CASE WHEN @SortBy = 'changedAt' AND @SortDir = 'asc'  THEN a.ChangedAt END ASC,
    CASE WHEN @SortBy = 'changedAt' AND @SortDir = 'desc' THEN a.ChangedAt END DESC
  OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
