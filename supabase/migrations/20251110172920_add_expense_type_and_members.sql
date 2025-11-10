/*
  # Add Expense Type and Member Support

  1. Changes to expenses table
    - Add expense_type column ('personal' or 'split')
    - Add group_id reference for split expenses
    - Add paid_by reference (already exists as user_id)
  
  2. New members table
    - id, name, email, phone, created_by, created_at
    - For tracking non-app users who participate in splits
  
  3. Update bill_split_shares
    - Add member_id to support non-app users
    - Make user_id nullable
  
  4. Features
    - Track personal vs split expenses
    - Support members who aren't app users
    - Calculate balances within groups
*/

-- Add expense_type to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'expense_type'
  ) THEN
    ALTER TABLE expenses ADD COLUMN expense_type text DEFAULT 'personal' CHECK (expense_type IN ('personal', 'split'));
  END IF;
END $$;

-- Add group_id to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN group_id uuid REFERENCES groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create members table for non-app users
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own members"
  ON members FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own members"
  ON members FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own members"
  ON members FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Add member_id to bill_split_shares and make user_id nullable
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bill_split_shares' AND column_name = 'member_id'
  ) THEN
    ALTER TABLE bill_split_shares ADD COLUMN member_id uuid REFERENCES members(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make user_id nullable in bill_split_shares
DO $$
BEGIN
  ALTER TABLE bill_split_shares ALTER COLUMN user_id DROP NOT NULL;
END $$;

-- Add check constraint to ensure either user_id or member_id is set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bill_split_shares_user_or_member'
  ) THEN
    ALTER TABLE bill_split_shares ADD CONSTRAINT bill_split_shares_user_or_member
      CHECK (
        (user_id IS NOT NULL AND member_id IS NULL) OR
        (user_id IS NULL AND member_id IS NOT NULL)
      );
  END IF;
END $$;

-- Update RLS policies for bill_split_shares to include member access
DROP POLICY IF EXISTS "Users can view their bill split shares" ON bill_split_shares;
CREATE POLICY "Users can view their bill split shares"
  ON bill_split_shares FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    member_id IN (
      SELECT id FROM members WHERE created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM bill_splits
      WHERE bill_splits.id = bill_split_shares.bill_split_id
      AND bill_splits.paid_by = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_bill_split_shares_member ON bill_split_shares(member_id);