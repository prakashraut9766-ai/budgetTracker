import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AddExpenseModal } from '../components/Expenses/AddExpenseModal';
import { SetBudgetModal } from '../components/Budgets/SetBudgetModal';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  LogOut,
  PieChart,
  Calendar,
  DollarSign
} from 'lucide-react';

interface BudgetData {
  type: 'daily' | 'weekly' | 'monthly';
  amount: number;
  spent: number;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSetBudget, setShowSetBudget] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const weekStart = startOfWeek.toISOString().split('T')[0];

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const monthStart = startOfMonth.toISOString().split('T')[0];

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      setRecentExpenses(expenses || []);

      const dailyTotal = expenses
        ?.filter(e => e.date === today)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const weeklyTotal = expenses
        ?.filter(e => e.date >= weekStart)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const monthlyTotal = expenses
        ?.filter(e => e.date >= monthStart)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setTotalSpent(monthlyTotal);

      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .lte('start_date', today)
        .gte('end_date', today);

      const budgetSummary: BudgetData[] = [];

      budgetData?.forEach(budget => {
        if (budget.type === 'daily') {
          budgetSummary.push({ type: 'daily', amount: Number(budget.amount), spent: dailyTotal });
        } else if (budget.type === 'weekly') {
          budgetSummary.push({ type: 'weekly', amount: Number(budget.amount), spent: weeklyTotal });
        } else if (budget.type === 'monthly') {
          budgetSummary.push({ type: 'monthly', amount: Number(budget.amount), spent: monthlyTotal });
        }
      });

      setBudgets(budgetSummary);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBudgetStatus = (budget: BudgetData) => {
    const percentage = (budget.spent / budget.amount) * 100;
    if (percentage >= 100) return { color: 'red', status: 'Over budget!' };
    if (percentage >= 80) return { color: 'yellow', status: 'Warning' };
    return { color: 'green', status: 'On track' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Budget Tracker</h1>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600">Here's your spending overview</p>
        </div>

        {budgets.length === 0 ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 mb-8 text-center">
            <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your first budget</h3>
            <p className="text-gray-600 mb-4">Get started by creating daily, weekly, or monthly budgets</p>
            <button
              onClick={() => setShowSetBudget(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {budgets.map((budget, index) => {
              const status = getBudgetStatus(budget);
              const percentage = Math.min((budget.spent / budget.amount) * 100, 100);

              return (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600 uppercase">{budget.type} Budget</h3>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      status.color === 'green' ? 'bg-green-100 text-green-800' :
                      status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-gray-900">${budget.spent.toFixed(2)}</span>
                      <span className="text-gray-500">/ ${budget.amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          status.color === 'green' ? 'bg-green-500' :
                          status.color === 'yellow' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    ${(budget.amount - budget.spent).toFixed(2)} remaining
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setShowAddExpense(true)}
            className="bg-blue-600 text-white rounded-xl p-6 hover:bg-blue-700 transition flex items-center justify-between group"
          >
            <div className="text-left">
              <div className="text-sm font-medium mb-1 opacity-90">Add Expense</div>
              <div className="text-2xl font-bold">Quick Entry</div>
            </div>
            <Plus className="w-8 h-8 group-hover:scale-110 transition" />
          </button>

          <button className="bg-white rounded-xl p-6 hover:shadow-md transition flex items-center justify-between group border-2 border-gray-200">
            <div className="text-left">
              <div className="text-sm font-medium text-gray-600 mb-1">View</div>
              <div className="text-2xl font-bold text-gray-900">Insights</div>
            </div>
            <PieChart className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition" />
          </button>

          <button
            onClick={() => setShowSetBudget(true)}
            className="bg-white rounded-xl p-6 hover:shadow-md transition flex items-center justify-between group border-2 border-gray-200"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-gray-600 mb-1">Manage</div>
              <div className="text-2xl font-bold text-gray-900">Budgets</div>
            </div>
            <DollarSign className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Expenses</h3>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-12">
              <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No expenses yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your first expense to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${Number(expense.amount).toFixed(2)}</p>
                    {expense.merchant && (
                      <p className="text-sm text-gray-500">{expense.merchant}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={loadDashboardData}
      />

      <SetBudgetModal
        isOpen={showSetBudget}
        onClose={() => setShowSetBudget(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}
