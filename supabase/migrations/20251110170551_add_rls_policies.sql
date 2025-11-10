/*
  # RLS Policies for Budget Tracker

  1. Security Policies
    - Profiles: Users can manage their own profile
    - Categories: Users can manage their own categories
    - Budgets: Users can manage their own budgets
    - Expenses: Users can manage their own expenses
    - Groups: Members can view, admins can manage
    - Group Members: Members can view, admins can manage
    - Bill Splits: Participants can view their splits
    - Bill Split Shares: Users can view/manage their shares
*/

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Group admins can delete groups"
  ON groups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Group members policies
CREATE POLICY "Users can view group members of their groups"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can add first member"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Group admins can update members"
  ON group_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- Bill splits policies
CREATE POLICY "Users can view bill splits they are involved in"
  ON bill_splits FOR SELECT
  TO authenticated
  USING (
    auth.uid() = paid_by OR
    EXISTS (
      SELECT 1 FROM bill_split_shares
      WHERE bill_split_shares.bill_split_id = bill_splits.id
      AND bill_split_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bill splits for their expenses"
  ON bill_splits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = paid_by);

CREATE POLICY "Users can update their bill splits"
  ON bill_splits FOR UPDATE
  TO authenticated
  USING (auth.uid() = paid_by)
  WITH CHECK (auth.uid() = paid_by);

CREATE POLICY "Users can delete their bill splits"
  ON bill_splits FOR DELETE
  TO authenticated
  USING (auth.uid() = paid_by);

-- Bill split shares policies
CREATE POLICY "Users can view their bill split shares"
  ON bill_split_shares FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM bill_splits
      WHERE bill_splits.id = bill_split_shares.bill_split_id
      AND bill_splits.paid_by = auth.uid()
    )
  );

CREATE POLICY "Bill creators can insert shares"
  ON bill_split_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bill_splits
      WHERE bill_splits.id = bill_split_shares.bill_split_id
      AND bill_splits.paid_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own shares"
  ON bill_split_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Bill creators can delete shares"
  ON bill_split_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bill_splits
      WHERE bill_splits.id = bill_split_shares.bill_split_id
      AND bill_splits.paid_by = auth.uid()
    )
  );