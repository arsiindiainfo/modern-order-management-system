CREATE OR ALTER PROCEDURE dbo.usp_Discounts_Create
  @TenantId    UNIQUEIDENTIFIER,
  @ActorUserId UNIQUEIDENTIFIER,
  @Code        NVARCHAR(40),
  @Type        NVARCHAR(10),
  @Value       DECIMAL(12,2),
  @StartsAt    DATETIME2(3),
  @EndsAt      DATETIME2(3),
  @UsageLimit  INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF EXISTS (SELECT 1 FROM Discounts WHERE TenantId = @TenantId AND Code = @Code)
  BEGIN
    RAISERROR('DUPLICATE_ENTRY', 16, 1);
    RETURN;
  END

  DECLARE @Id UNIQUEIDENTIFIER = NEWID();

  BEGIN TRANSACTION;
    INSERT INTO Discounts (Id, TenantId, Code, Type, Value, StartsAt, EndsAt, UsageLimit)
    VALUES (@Id, @TenantId, @Code, @Type, @Value, @StartsAt, @EndsAt, @UsageLimit);

    INSERT INTO AuditLogs (Id, TenantId, EntityName, EntityId, Action, ChangedByUserId)
    VALUES (NEWID(), @TenantId, 'Discount', @Id, 'CREATE', @ActorUserId);
  COMMIT TRANSACTION;

  SELECT Id, Code, Type, Value, StartsAt, EndsAt, UsageLimit, TimesUsed, IsActive
  FROM Discounts
  WHERE Id = @Id;
END
