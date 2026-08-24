CREATE OR ALTER PROCEDURE dbo.usp_RefreshTokens_Create
  @UserId    UNIQUEIDENTIFIER,
  @TokenHash NVARCHAR(255),
  @ExpiresAt DATETIME2(3)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Id UNIQUEIDENTIFIER = NEWID();

  INSERT INTO RefreshTokens (Id, UserId, TokenHash, ExpiresAt)
  VALUES (@Id, @UserId, @TokenHash, @ExpiresAt);

  SELECT Id, UserId, TokenHash, ExpiresAt, CreatedAt
  FROM RefreshTokens
  WHERE Id = @Id;
END
