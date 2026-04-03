import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: Array<Record<string, any>>;
  dataKeys: Array<{
    key: string;
    name: string;
    fill: string;
  }>;
  title: string;
  xAxisKey: string;
  layout?: 'vertical' | 'horizontal';
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
        <p className="text-xs text-gray-300">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.fill }} className="text-xs">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  dataKeys,
  title,
  xAxisKey,
  layout = 'horizontal',
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={
            layout === 'vertical'
              ? { top: 10, right: 30, left: 120, bottom: 10 }
              : { top: 10, right: 30, left: 0, bottom: 0 }
          }
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={layout !== 'vertical'} />
          <XAxis
            dataKey={xAxisKey}
            type={layout === 'vertical' ? 'number' : 'category'}
            stroke="#6B7280"
            style={{ fontSize: '0.75rem' }}
            {...(layout === 'horizontal' && { angle: -45, textAnchor: 'end', height: 80 })}
          />
          <YAxis
            type={layout === 'vertical' ? 'category' : 'number'}
            stroke="#6B7280"
            style={{ fontSize: '0.75rem' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: '0.875rem' }} />
          {dataKeys.map((dataKey) => (
            <Bar
              key={dataKey.key}
              dataKey={dataKey.key}
              name={dataKey.name}
              fill={dataKey.fill}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};
