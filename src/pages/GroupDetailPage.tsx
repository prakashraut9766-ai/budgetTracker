import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AddMemberModal } from '../components/Groups/AddMemberModal';
import {
  ArrowLeft,
  Users,
  Plus,
  DollarSign,
  User,
  Wallet,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface GroupMember {
  id: string;
  name: string;
  type: 'user' | 'member';
  role: string;
}

interface Balance {
  memberId: string;
  memberName: string;
  balance: number;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  paid_by_name: string;
}

interface GroupDetailPageProps {
  groupId: string;
  onNavigateBack: () => void;
}

export function GroupDetailPage({ groupId, onNavigateBack }: GroupDetailPageProps) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, [groupId, user]);

  const loadGroupData = async () => {
    if (!user) return;

    const { data: groupData } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (groupData) {
      setGroupName(groupData.name);
    }

    await loadMembers();
    await loadExpenses();
    await calculateBalances();
    setLoading(false);
  };

  const loadMembers = async () => {
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user_id, role')
      .eq('group_id', groupId);

    if (!groupMembers) return;

    const membersList: GroupMember[] = [];

    for (const gm of groupMembers) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', gm.user_id)
        .single();

      if (profile) {
        membersList.push({
          id: profile.id,
          name: profile.full_name || 'User',
          type: 'user',
          role: gm.role,
        });
      }
    }

    setMembers(membersList);
  };

  const loadExpenses = async () => {
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('id, amount, description, date, user_id')
      .eq('group_id', groupId)
      .eq('expense_type', 'split')
      .order('date', { ascending: false })
      .limit(10);

    if (!expenseData) return;

    const expensesWithNames = await Promise.all(
      expenseData.map(async (expense) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', expense.user_id)
          .single();

        return {
          id: expense.id,
          amount: Number(expense.amount),
          description: expense.description,
          date: expense.date,
          paid_by_name: profile?.full_name || 'Unknown',
        };
      })
    );

    setExpenses(expensesWithNames);
  };

  const calculateBalances = async () => {
    const { data: billSplits } = await supabase
      .from('bill_splits')
      .select('id, paid_by')
      .eq('group_id', groupId);

    if (!billSplits) return;

    const balanceMap: Record<string, number> = {};

    for (const split of billSplits) {
      const { data: shares } = await supabase
        .from('bill_split_shares')
        .select('user_id, member_id, amount, paid')
        .eq('bill_split_id', split.id);

      if (!shares) continue;

      for (const share of shares) {
        const memberId = share.user_id || share.member_id;
        if (!memberId) continue;

        if (!balanceMap[memberId]) {
          balanceMap[memberId] = 0;
        }

        if (!share.paid) {
          balanceMap[memberId] -= Number(share.amount);
        }
      }

      if (!balanceMap[split.paid_by]) {
        balanceMap[split.paid_by] = 0;
      }

      const totalOwed = shares
        .filter((s) => !s.paid)
        .reduce((sum, s) => sum + Number(s.amount), 0);

      balanceMap[split.paid_by] += totalOwed;
    }

    const balancesList: Balance[] = [];

    for (const [memberId, balance] of Object.entries(balanceMap)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', memberId)
        .maybeSingle();

      const { data: member } = await supabase
        .from('members')
        .select('name')
        .eq('id', memberId)
        .maybeSingle();

      const memberName = profile?.full_name || member?.name || 'Unknown';

      if (Math.abs(balance) > 0.01) {
        balancesList.push({
          memberId,
          memberName,
          balance,
        });
      }
    }

    balancesList.sort((a, b) => b.balance - a.balance);
    setBalances(balancesList);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Groups</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{groupName}</h1>
            </div>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Balances</h3>
              </div>

              {balances.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">All settled up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {balances.map((balance) => (
                    <div
                      key={balance.memberId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            balance.balance > 0 ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          {balance.balance > 0 ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{balance.memberName}</p>
                          <p className="text-sm text-gray-500">
                            {balance.balance > 0 ? 'Gets back' : 'Owes'}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`text-right ${
                          balance.balance > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        <p className="text-xl font-bold">
                          ${Math.abs(balance.balance).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Expenses</h3>

              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No expenses yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{expense.description}</p>
                        <p className="text-sm text-gray-500">
                          Paid by {expense.paid_by_name} •{' '}
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Members</h3>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                </button>
              </div>

              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <Users className="w-10 h-10 text-blue-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Add expenses to this group</h4>
              <p className="text-sm text-gray-600 mb-4">
                Use the Add Expense button on the dashboard and select this group to split costs
              </p>
              <button
                onClick={onNavigateBack}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        onSuccess={loadGroupData}
      />
    </div>
  );
}
