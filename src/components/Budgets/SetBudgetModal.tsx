import { useState } from 'react';
import { X, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetBudgetModal({ isOpen, onClose, onSuccess }: SetBudgetModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getDateRange = (budgetType: 'daily' | 'weekly' | 'monthly') => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    if (budgetType === 'daily') {
      startDate = today;
      endDate = today;
    } else if (budgetType === 'weekly') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
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

    const dateRange = getDateRange(type);

    const { data: existingBudget } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', type)
      .gte('end_date', dateRange.start_date)
      .maybeSingle();

    if (existingBudget) {
      const { error: updateError } = await supabase
        .from('budgets')
        .update({
          amount: numAmount,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        })
        .eq('id', existingBudget.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('budgets').insert({
        user_id: user.id,
        type,
        amount: numAmount,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    setAmount('');
    setLoading(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Set Budget</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Period
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Amount
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
            <p className="mt-2 text-sm text-gray-500">
              Set your {type} spending limit
            </p>
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
              {loading ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
