CREATE OR ALTER PROCEDURE dbo.usp_RefreshTokens_Rotate
  @OldTokenHash NVARCHAR(255),
  @NewTokenHash NVARCHAR(255),
  @NewExpiresAt DATETIME2(3)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @Id UNIQUEIDENTIFIER, @UserId UNIQUEIDENTIFIER,
          @RevokedAt DATETIME2(3), @ExpiresAt DATETIME2(3);

  SELECT @Id = Id, @UserId = UserId, @RevokedAt = RevokedAt, @ExpiresAt = ExpiresAt
  FROM RefreshTokens
  WHERE TokenHash = @OldTokenHash;

  IF @Id IS NULL OR @ExpiresAt < SYSUTCDATETIME()
  BEGIN
    RAISERROR('UNAUTHENTICATED', 16, 1);
    RETURN;
  END

  IF @RevokedAt IS NOT NULL
  BEGIN
    -- Reuse of an already-rotated token: treat as a replay attack and
    -- revoke every outstanding token for this user (whole-session revoke).
    UPDATE RefreshTokens
    SET RevokedAt = SYSUTCDATETIME()
    WHERE UserId = @UserId AND RevokedAt IS NULL;

    RAISERROR('UNAUTHENTICATED', 16, 1);
    RETURN;
  END

  DECLARE @NewId UNIQUEIDENTIFIER = NEWID();

  BEGIN TRANSACTION;
    UPDATE RefreshTokens SET RevokedAt = SYSUTCDATETIME() WHERE Id = @Id;

    INSERT INTO RefreshTokens (Id, UserId, TokenHash, ExpiresAt)
    VALUES (@NewId, @UserId, @NewTokenHash, @NewExpiresAt);
  COMMIT TRANSACTION;

  SELECT Id, UserId, TokenHash, ExpiresAt, CreatedAt
  FROM RefreshTokens
  WHERE Id = @NewId;
END
