CREATE OR ALTER PROCEDURE dbo.usp_RefreshTokens_Revoke
  @TokenHash NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE RefreshTokens
  SET RevokedAt = SYSUTCDATETIME()
  WHERE TokenHash = @TokenHash
    AND RevokedAt IS NULL;
END
