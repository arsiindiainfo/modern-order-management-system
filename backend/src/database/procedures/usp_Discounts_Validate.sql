CREATE OR ALTER PROCEDURE dbo.usp_Discounts_Validate
  @TenantId UNIQUEIDENTIFIER,
  @Code     NVARCHAR(40),
  @Subtotal DECIMAL(12,2)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Id UNIQUEIDENTIFIER, @Type NVARCHAR(10), @Value DECIMAL(12,2),
          @IsActive BIT, @StartsAt DATETIME2(3), @EndsAt DATETIME2(3),
          @UsageLimit INT, @TimesUsed INT;

  SELECT @Id = Id, @Type = Type, @Value = Value, @IsActive = IsActive,
         @StartsAt = StartsAt, @EndsAt = EndsAt, @UsageLimit = UsageLimit, @TimesUsed = TimesUsed
  FROM Discounts
  WHERE TenantId = @TenantId AND Code = @Code;

  IF @Id IS NULL OR @IsActive = 0
     OR SYSUTCDATETIME() < @StartsAt OR SYSUTCDATETIME() > @EndsAt
     OR (@UsageLimit IS NOT NULL AND @TimesUsed >= @UsageLimit)
  BEGIN
    RAISERROR('DISCOUNT_NOT_APPLICABLE', 16, 1);
    RETURN;
  END

  SELECT @Code AS Code, @Type AS Type, @Value AS Value,
         dbo.ufn_ComputeDiscountAmount(@Type, @Value, @Subtotal) AS DiscountAmount;
END
