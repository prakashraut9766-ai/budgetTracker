import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CreateGroupModal } from '../components/Groups/CreateGroupModal';
import { Users, Plus, ChevronRight, Wallet, ArrowLeft } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  member_count: number;
  total_expenses: number;
}

interface GroupsPageProps {
  onNavigateBack: () => void;
  onNavigateToGroup: (groupId: string) => void;
}

export function GroupsPage({ onNavigateBack, onNavigateToGroup }: GroupsPageProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    const { data: groupData } = await supabase
      .from('groups')
      .select('id, name, description, created_at')
      .order('created_at', { ascending: false });

    if (groupData) {
      const groupsWithStats = await Promise.all(
        groupData.map(async (group) => {
          const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('group_id', group.id)
            .eq('expense_type', 'split');

          const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

          return {
            ...group,
            member_count: memberCount || 0,
            total_expenses: totalExpenses,
          };
        })
      );

      setGroups(groupsWithStats);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading groups...</p>
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
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Budget Tracker</h1>
            </div>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Groups</h2>
            <p className="text-gray-600">Manage shared expenses with your groups</p>
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first group to start splitting expenses with others
            </p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onNavigateToGroup(group.id)}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Members</p>
                    <p className="text-sm font-semibold text-gray-900">{group.member_count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Spent</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ${group.total_expenses.toFixed(2)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSuccess={loadGroups}
      />
    </div>
  );
}
