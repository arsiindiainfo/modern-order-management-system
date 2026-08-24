CREATE OR ALTER PROCEDURE dbo.usp_Auth_GetUserByEmail
  @Email NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    Id,
    TenantId,
    FullName,
    Email,
    PasswordHash,
    Role,
    IsActive
  FROM Users
  WHERE Email = @Email
    AND IsActive = 1;
END
