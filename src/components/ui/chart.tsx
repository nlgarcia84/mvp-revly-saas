'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type ChartProps = {
  children: React.ReactNode;
  className?: string;
};

export const Chart = ({ children, className = '' }: ChartProps) => (
  <div className={`w-full ${className}`}>
    {children}
  </div>
);

type BarChartProps = {
  data: { label: string; value: number; secondary?: number }[];
  bars: { key: string; color: string; name: string }[];
  height?: number;
};

export const ChartBar = ({ data, bars, height = 200 }: BarChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} barCategoryGap="20%">
      <XAxis
        dataKey="label"
        tick={{ fontSize: 11, fill: '#a3a3a3' }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fontSize: 11, fill: '#a3a3a3' }}
        axisLine={false}
        tickLine={false}
        allowDecimals={false}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'var(--tooltip-bg, #fff)',
          border: '1px solid var(--tooltip-border, #e5e5e5)',
          borderRadius: 8,
          fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
      />
      {bars.map((bar) => (
        <Bar
          key={bar.key}
          dataKey={bar.key}
          fill={bar.color}
          radius={[4, 4, 0, 0]}
          name={bar.name}
        />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

type LineChartProps = {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
};

export const ChartLine = ({ data, height = 200, color = '#0a0a0a' }: LineChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <XAxis
        dataKey="label"
        tick={{ fontSize: 11, fill: '#a3a3a3' }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fontSize: 11, fill: '#a3a3a3' }}
        axisLine={false}
        tickLine={false}
        allowDecimals={false}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'var(--tooltip-bg, #fff)',
          border: '1px solid var(--tooltip-border, #e5e5e5)',
          borderRadius: 8,
          fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
      />
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        dot={{ fill: color, r: 3 }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
  </ResponsiveContainer>
);

type PieChartProps = {
  data: { name: string; value: number; color: string }[];
  height?: number;
};

export const ChartPie = ({ data, height = 200 }: PieChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={50}
        outerRadius={80}
        paddingAngle={2}
        dataKey="value"
      >
        {data.map((entry, i) => (
          <Cell key={i} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          backgroundColor: 'var(--tooltip-bg, #fff)',
          border: '1px solid var(--tooltip-border, #e5e5e5)',
          borderRadius: 8,
          fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      />
    </PieChart>
  </ResponsiveContainer>
);