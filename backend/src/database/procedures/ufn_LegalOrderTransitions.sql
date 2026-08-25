CREATE OR ALTER FUNCTION dbo.ufn_LegalOrderTransitions()
RETURNS TABLE
AS
RETURN (
  -- The full §8 diagram, not just what Phase 3 can reach — this is the
  -- one source of truth every status write is checked against
  -- (usp_Orders_UpdateStatus, §6.3 Pattern C), and Phase 4's payment/
  -- shipping flows just start exercising edges that already exist here
  -- instead of ALTERing this function again.
  SELECT * FROM (VALUES
    ('PENDING',    'CONFIRMED'),
    ('CONFIRMED',  'PROCESSING'),
    ('PROCESSING', 'SHIPPED'),
    ('CONFIRMED',  'SHIPPED'),   -- usp_Orders_RecordShipment (Phase 4): nothing in the plan documents what action drives CONFIRMED->PROCESSING, so shipping is legal straight from CONFIRMED too — the only pre-ship state Phase 4 can actually reach
    ('SHIPPED',    'DELIVERED'),
    ('PENDING',    'ON_HOLD'),
    ('CONFIRMED',  'ON_HOLD'),
    ('PROCESSING', 'ON_HOLD'),
    ('ON_HOLD',    'PENDING'),      -- resume, for a hold placed pre-confirmation (the only case reachable before Phase 4)
    ('ON_HOLD',    'PROCESSING'),   -- resume, for a hold placed after confirmation (§8 diagram's literal arrow)
    ('PENDING',    'CANCELLED'),
    ('CONFIRMED',  'CANCELLED'),
    ('PROCESSING', 'CANCELLED'),
    ('ON_HOLD',    'CANCELLED')
  ) AS t (FromStatus, ToStatus)
)
