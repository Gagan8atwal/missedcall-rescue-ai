interface StatsCardProps {
  title: string;
  value: number;
  color?: 'blue' | 'green' | 'red' | 'default';
}

const colorMap = {
  default: 'bg-white text-gray-900',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
};

export default function StatsCard({ title, value, color = 'default' }: StatsCardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 p-6 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
