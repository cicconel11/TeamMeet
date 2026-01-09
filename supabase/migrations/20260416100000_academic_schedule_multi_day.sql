-- Allow weekly schedules to include multiple days of the week
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.academic_schedules'::regclass
      AND contype = 'c'
      AND pg_get_expr(conbin, conrelid) ILIKE '%day_of_week%'
  LOOP
    EXECUTE format('ALTER TABLE public.academic_schedules DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END$$;

ALTER TABLE public.academic_schedules
  ALTER COLUMN day_of_week TYPE SMALLINT[] USING (
    CASE
      WHEN day_of_week IS NULL THEN NULL
      ELSE ARRAY[day_of_week]
    END
  );

ALTER TABLE public.academic_schedules
  ADD CONSTRAINT academic_schedules_day_of_week_range CHECK (
    day_of_week IS NULL
    OR (
      cardinality(day_of_week) > 0
      AND day_of_week <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
    )
  ),
  ADD CONSTRAINT academic_schedules_weekly_requires_day CHECK (
    occurrence_type != 'weekly'
    OR (
      day_of_week IS NOT NULL
      AND cardinality(day_of_week) > 0
    )
  );
