import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | null;
  color: 'blue' | 'green' | 'red' | 'purple' | 'indigo' | 'orange' | 'teal';
}

const colorClasses = {
  blue: 'from-blue-600 to-blue-700',
  green: 'from-green-600 to-green-700',
  red: 'from-red-600 to-red-700',
  purple: 'from-purple-600 to-purple-700',
  indigo: 'from-indigo-600 to-indigo-700',
  orange: 'from-orange-600 to-orange-700',
  teal: 'from-teal-600 to-teal-700',
};

export default function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium mb-2">{title}</p>
          <p className="text-white text-3xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-xs font-medium">vs last week</span>
            </div>
          )}
        </div>
        <div className={`bg-gradient-to-br ${colorClasses[color]} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
