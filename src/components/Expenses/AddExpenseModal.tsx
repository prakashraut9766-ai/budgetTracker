import { useState, useEffect } from 'react';
import { X, DollarSign, FileText, Calendar, Tag, Store, Users, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Group {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  type: 'user' | 'member';
}

interface SplitShare {
  memberId: string;
  memberName: string;
  type: 'user' | 'member';
  amount: number;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [expenseType, setExpenseType] = useState<'personal' | 'split'>('personal');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && user) {
      loadCategories();
      loadGroups();
      loadMembers();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (expenseType === 'split' && members.length > 0) {
      setSelectedMembers([`user-${user?.id}`]);
    }
  }, [expenseType, members, user]);

  const loadCategories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (data) {
      setCategories(data);
      if (data.length > 0 && !categoryId) {
        setCategoryId(data[0].id);
      }
    }

    if (data?.length === 0) {
      await createDefaultCategories();
    }
  };

  const createDefaultCategories = async () => {
    if (!user) return;

    const defaultCategories = [
      { name: 'Food & Dining', icon: 'utensils', color: '#EF4444' },
      { name: 'Transportation', icon: 'car', color: '#3B82F6' },
      { name: 'Shopping', icon: 'shopping-bag', color: '#8B5CF6' },
      { name: 'Entertainment', icon: 'film', color: '#EC4899' },
      { name: 'Bills & Utilities', icon: 'file-text', color: '#F59E0B' },
      { name: 'Healthcare', icon: 'heart', color: '#10B981' },
      { name: 'Other', icon: 'more-horizontal', color: '#6B7280' },
    ];

    const { data } = await supabase
      .from('categories')
      .insert(
        defaultCategories.map(cat => ({
          user_id: user.id,
          ...cat,
          is_default: true,
        }))
      )
      .select();

    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setCategoryId(data[0].id);
      }
    }
  };

  const loadGroups = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('groups')
      .select('id, name')
      .order('name');

    if (data) {
      setGroups(data);
    }
  };

  const loadMembers = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .single();

    const { data: memberData } = await supabase
      .from('members')
      .select('id, name')
      .eq('created_by', user.id);

    const allMembers: Member[] = [];

    if (profile) {
      allMembers.push({
        id: `user-${profile.id}`,
        name: profile.full_name || 'You',
        type: 'user',
      });
    }

    if (memberData) {
      allMembers.push(...memberData.map(m => ({
        id: `member-${m.id}`,
        name: m.name,
        type: 'member' as const,
      })));
    }

    setMembers(allMembers);
  };

  const toggleMember = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const calculateSplits = (): SplitShare[] => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || selectedMembers.length === 0) return [];

    if (splitType === 'equal') {
      const shareAmount = numAmount / selectedMembers.length;
      return selectedMembers.map(memberId => {
        const member = members.find(m => m.id === memberId);
        return {
          memberId,
          memberName: member?.name || 'Unknown',
          type: member?.type || 'user',
          amount: shareAmount,
        };
      });
    } else {
      return selectedMembers.map(memberId => {
        const member = members.find(m => m.id === memberId);
        const customAmount = parseFloat(customAmounts[memberId] || '0');
        return {
          memberId,
          memberName: member?.name || 'Unknown',
          type: member?.type || 'user',
          amount: customAmount,
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    if (expenseType === 'split') {
      if (selectedMembers.length === 0) {
        setError('Please select at least one member for split');
        setLoading(false);
        return;
      }

      const splits = calculateSplits();
      const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);

      if (Math.abs(totalSplit - numAmount) > 0.01) {
        setError(`Split amounts must equal total amount. Current: $${totalSplit.toFixed(2)}`);
        setLoading(false);
        return;
      }
    }

    const { data: expenseData, error: insertError } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        amount: numAmount,
        description,
        merchant: merchant || null,
        date,
        category_id: categoryId || null,
        notes: notes || null,
        input_method: 'manual',
        expense_type: expenseType,
        group_id: expenseType === 'split' && selectedGroupId ? selectedGroupId : null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (expenseType === 'split' && expenseData) {
      const { data: billSplitData, error: billSplitError } = await supabase
        .from('bill_splits')
        .insert({
          expense_id: expenseData.id,
          group_id: selectedGroupId || null,
          total_amount: numAmount,
          paid_by: user.id,
          split_type: splitType,
        })
        .select()
        .single();

      if (billSplitError) {
        setError(billSplitError.message);
        setLoading(false);
        return;
      }

      const splits = calculateSplits();
      const splitShares = splits.map(split => {
        const isUser = split.type === 'user';
        const actualId = split.memberId.replace(/^(user|member)-/, '');

        return {
          bill_split_id: billSplitData.id,
          user_id: isUser ? actualId : null,
          member_id: isUser ? null : actualId,
          amount: split.amount,
          paid: split.memberId === `user-${user.id}`,
        };
      });

      const { error: sharesError } = await supabase
        .from('bill_split_shares')
        .insert(splitShares);

      if (sharesError) {
        setError(sharesError.message);
        setLoading(false);
        return;
      }
    }

    setAmount('');
    setDescription('');
    setMerchant('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setExpenseType('personal');
    setSelectedMembers([]);
    setCustomAmounts({});
    setLoading(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add Expense</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Expense Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExpenseType('personal')}
                className={`p-4 rounded-lg border-2 transition ${
                  expenseType === 'personal'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className={`w-6 h-6 mx-auto mb-2 ${expenseType === 'personal' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="font-semibold text-gray-900">Personal</div>
                <div className="text-xs text-gray-500 mt-1">Just for you</div>
              </button>
              <button
                type="button"
                onClick={() => setExpenseType('split')}
                className={`p-4 rounded-lg border-2 transition ${
                  expenseType === 'split'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className={`w-6 h-6 mx-auto mb-2 ${expenseType === 'split' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="font-semibold text-gray-900">Split</div>
                <div className="text-xs text-gray-500 mt-1">Share with others</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What did you buy?"
              />
            </div>
          </div>

          {expenseType === 'split' && (
            <>
              {groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group (Optional)
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Split Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSplitType('equal')}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                      splitType === 'equal'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('custom')}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                      splitType === 'custom'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Custom Split
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Split With *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleMember(member.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="flex-1 text-sm">{member.name}</span>
                      {splitType === 'custom' && selectedMembers.includes(member.id) && (
                        <input
                          type="number"
                          step="0.01"
                          value={customAmounts[member.id] || ''}
                          onChange={(e) =>
                            setCustomAmounts({ ...customAmounts, [member.id]: e.target.value })
                          }
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="0.00"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {splitType === 'equal' && selectedMembers.length > 0 && amount && (
                  <p className="mt-2 text-sm text-gray-600">
                    Each person pays: ${(parseFloat(amount) / selectedMembers.length).toFixed(2)}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Merchant
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Store or restaurant name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Additional details..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
