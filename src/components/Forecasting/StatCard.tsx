import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | null;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
}

export default function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-600/10 text-blue-400',
    green: 'bg-green-600/10 text-green-400',
    purple: 'bg-purple-600/10 text-purple-400',
    red: 'bg-red-600/10 text-red-400',
    orange: 'bg-orange-600/10 text-orange-400'
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-white">{value}</p>
        {trend && (
          <span className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend === 'up' ? '↗' : '↘'}
          </span>
        )}
      </div>
    </div>
  );
}