/*
  # Budget Tracker Schema - Tables

  1. Tables Created
    - profiles - User information
    - categories - Expense categories
    - budgets - Budget limits
    - expenses - Expense records
    - groups - Shared groups
    - group_members - Group membership
    - bill_splits - Bill split records
    - bill_split_shares - Individual shares

  2. Features
    - All tables have RLS enabled
    - Proper foreign key relationships
    - Check constraints for data integrity
    - Default values where appropriate
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text DEFAULT 'tag',
  color text DEFAULT '#3B82F6',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  merchant text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  input_method text DEFAULT 'manual' CHECK (input_method IN ('manual', 'sms', 'voice', 'ocr')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Bill splits table
CREATE TABLE IF NOT EXISTS bill_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  paid_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  split_type text DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;

-- Bill split shares table
CREATE TABLE IF NOT EXISTS bill_split_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_split_id uuid REFERENCES bill_splits(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  paid boolean DEFAULT false,
  paid_at timestamptz
);

ALTER TABLE bill_split_shares ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_type ON budgets(user_id, type);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_bill_splits_expense ON bill_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_bill_split_shares_user ON bill_split_shares(user_id, paid);