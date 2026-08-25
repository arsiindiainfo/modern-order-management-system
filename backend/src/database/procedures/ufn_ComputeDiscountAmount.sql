CREATE OR ALTER FUNCTION dbo.ufn_ComputeDiscountAmount(
  @Type     NVARCHAR(10),
  @Value    DECIMAL(12,2),
  @Subtotal DECIMAL(12,2)
)
RETURNS DECIMAL(12,2)
AS
BEGIN
  -- PERCENT: @Value% of the subtotal. FIXED: @Value capped at the subtotal
  -- itself, so a discount can never make a line negative.
  RETURN CASE
    WHEN @Type = 'PERCENT' THEN ROUND(@Subtotal * @Value / 100.0, 2)
    WHEN @Type = 'FIXED' THEN CASE WHEN @Value > @Subtotal THEN @Subtotal ELSE @Value END
    ELSE 0
  END;
END
