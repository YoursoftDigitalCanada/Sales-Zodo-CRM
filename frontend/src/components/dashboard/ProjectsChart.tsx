import { useState } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Area, AreaChart, BarChart, Bar
} from "recharts";
import { 
  TrendingUp, TrendingDown, BarChart3, LineChartIcon, 
  AreaChartIcon, MoreHorizontal, Download, RefreshCw,
  ArrowUpRight, ArrowDownRight, Calendar, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

const data = [
  { month: "Jan", projects: 150, completed: 120, pending: 30, revenue: 12500 },
  { month: "Feb", projects: 180, completed: 145, pending: 35, revenue: 15800 },
  { month: "Mar", projects: 280, completed: 220, pending: 60, revenue: 24500 },
  { month: "Apr", projects: 200, completed: 165, pending: 35, revenue: 18200 },
  { month: "May", projects: 350, completed: 290, pending: 60, revenue: 32000 },
  { month: "Jun", projects: 250, completed: 210, pending: 40, revenue: 22800 },
  { month: "Jul", projects: 280, completed: 240, pending: 40, revenue: 26500 },
  { month: "Aug", projects: 320, completed: 275, pending: 45, revenue: 29800 },
  { month: "Sep", projects: 380, completed: 320, pending: 60, revenue: 35200 },
  { month: "Oct", projects: 300, completed: 260, pending: 40, revenue: 28500 },
  { month: "Nov", projects: 420, completed: 365, pending: 55, revenue: 39800 },
  { month: "Dec", projects: 380, completed: 340, pending: 40, revenue: 36500 },
];

const chartTypes = [
  { id: 'area', icon: AreaChartIcon, label: 'Area' },
  { id: 'line', icon: LineChartIcon, label: 'Line' },
  { id: 'bar', icon: BarChart3, label: 'Bar' },
];

const periods = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a1a2e] border border-[rgba(15,23,42,0.06)] rounded-md p-4 card-shadow"
      >
        <p className="text-[#0891B2] font-semibold mb-3 text-sm">{label} 2024</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[#475569] text-xs">{entry.name}</span>
              </div>
              <span className="text-[#0F172A] font-semibold text-sm">
                {entry.name === 'Revenue' ? `$${entry.value.toLocaleString()}` : entry.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
  return null;
};

// Custom Legend Component
const CustomLegend = ({ payload, activeLines, toggleLine }: any) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
      {payload?.map((entry: any, index: number) => {
        const isActive = activeLines.includes(entry.dataKey);
        return (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleLine(entry.dataKey)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
              isActive 
                ? "bg-white/5" 
                : "bg-white/5 opacity-50"
            )}
          >
            <div 
              className="w-3 h-3 rounded-full transition-all"
              style={{ 
                backgroundColor: isActive ? entry.color : '#cbd5e1',
              }}
            />
            <span className={cn(
              "text-xs font-medium transition-colors",
              isActive ? "text-[#0F172A]" : "text-[#475569]"
            )}>
              {entry.value}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export function ProjectsChart() {
  const [chartType, setChartType] = useState('area');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [activeLines, setActiveLines] = useState(['projects', 'completed', 'pending']);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleLine = (dataKey: string) => {
    setActiveLines(prev => 
      prev.includes(dataKey) 
        ? prev.filter(key => key !== dataKey)
        : [...prev, dataKey]
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Calculate summary stats
  const totalProjects = data.reduce((sum, item) => sum + item.projects, 0);
  const totalCompleted = data.reduce((sum, item) => sum + item.completed, 0);
  const completionRate = Math.round((totalCompleted / totalProjects) * 100);
  const avgMonthly = Math.round(totalProjects / 12);

  const summaryStats = [
    { 
      label: 'Total Projects', 
      value: totalProjects.toLocaleString(), 
      trend: 12, 
      color: 'teal' 
    },
    { 
      label: 'Completion Rate', 
      value: `${completionRate}%`, 
      trend: 5, 
      color: 'gold' 
    },
    { 
      label: 'Monthly Avg', 
      value: avgMonthly.toLocaleString(), 
      trend: -2, 
      color: 'navy' 
    },
  ];

  const chartColors = {
    projects: '#22D3EE',
    completed: '#FBBF24',
    pending: '#1a1a2e',
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: -10, bottom: 0 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={(props) => <CustomLegend {...props} activeLines={activeLines} toggleLine={toggleLine} />} />
            {activeLines.includes('projects') && (
              <Bar 
                dataKey="projects" 
                fill={chartColors.projects}
                radius={[4, 4, 0, 0]}
                name="Projects"
              />
            )}
            {activeLines.includes('completed') && (
              <Bar 
                dataKey="completed" 
                fill={chartColors.completed}
                radius={[4, 4, 0, 0]}
                name="Completed"
              />
            )}
            {activeLines.includes('pending') && (
              <Bar 
                dataKey="pending" 
                fill={chartColors.pending}
                radius={[4, 4, 0, 0]}
                name="Pending"
              />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={(props) => <CustomLegend {...props} activeLines={activeLines} toggleLine={toggleLine} />} />
            {activeLines.includes('projects') && (
              <Line 
                type="monotone" 
                dataKey="projects" 
                stroke={chartColors.projects}
                strokeWidth={3}
                dot={{ fill: chartColors.projects, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: chartColors.projects }}
                name="Projects"
              />
            )}
            {activeLines.includes('completed') && (
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke={chartColors.completed}
                strokeWidth={3}
                dot={{ fill: chartColors.completed, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: chartColors.completed }}
                name="Completed"
              />
            )}
            {activeLines.includes('pending') && (
              <Line 
                type="monotone" 
                dataKey="pending" 
                stroke={chartColors.pending}
                strokeWidth={3}
                dot={{ fill: chartColors.pending, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: chartColors.pending }}
                name="Pending"
              />
            )}
          </LineChart>
        );

      default: // area
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.projects} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColors.projects} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.completed} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColors.completed} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.pending} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColors.pending} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="month" 
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={(props) => <CustomLegend {...props} activeLines={activeLines} toggleLine={toggleLine} />} />
            {activeLines.includes('projects') && (
              <Area 
                type="monotone" 
                dataKey="projects" 
                stroke={chartColors.projects}
                strokeWidth={3}
                fill="url(#colorProjects)"
                name="Projects"
              />
            )}
            {activeLines.includes('completed') && (
              <Area 
                type="monotone" 
                dataKey="completed" 
                stroke={chartColors.completed}
                strokeWidth={3}
                fill="url(#colorCompleted)"
                name="Completed"
              />
            )}
            {activeLines.includes('pending') && (
              <Area 
                type="monotone" 
                dataKey="pending" 
                stroke={chartColors.pending}
                strokeWidth={3}
                fill="url(#colorPending)"
                name="Pending"
              />
            )}
          </AreaChart>
        );
    }
  };

  return (
    <Card className="overflow-hidden border-none card-shadow bg-white/5">
      {/* Header */}
      <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 10 }}
              className="h-12 w-12 rounded-md bg-[#F1F5F9]/70 flex items-center justify-center "
            >
              <BarChart3 size={22} className="text-[#0F172A]" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-[#0F172A]">Projects Overview</h3>
              <p className="text-sm text-[#475569]">Track your project performance</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Chart Type Selector */}
            <div className="flex items-center bg-white/5 rounded-md p-1">
              {chartTypes.map((type) => (
                <motion.button
                  key={type.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setChartType(type.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all",
                    chartType === type.id 
                      ? "bg-white/5 text-[#0F172A] shadow-sm" 
                      : "text-[#94A3B8] hover:text-[#0F172A]"
                  )}
                >
                  <type.icon size={14} />
                  <span className="hidden sm:inline">{type.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Period Selector */}
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white/5 border-none rounded-md px-4 py-2.5 pr-8 text-xs font-medium text-[#0F172A] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
              >
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>{period.label}</option>
                ))}
              </select>
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="p-2.5 rounded-md bg-white/5 text-[#94A3B8] hover:text-[#0891B2] hover:bg-[#0891B2]/10 transition-all"
              >
                <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-md bg-white/5 text-[#94A3B8] hover:text-[#0891B2] hover:bg-[#0891B2]/10 transition-all"
              >
                <Download size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-md bg-white/5 text-[#94A3B8] hover:text-[#0891B2] hover:bg-[#0891B2]/10 transition-all"
              >
                <MoreHorizontal size={16} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {summaryStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-md border transition-all hover:shadow-md",
                stat.color === 'teal' && "bg-[#0891B2]/5 border-[#22D3EE]/20",
                stat.color === 'gold' && "bg-[#D97706]/5 border-[#FBBF24]/20",
                stat.color === 'navy' && "bg-[#1a1a2e]/5 border-[#1a1a2e]/20"
              )}
            >
              <p className="text-xs text-[#94A3B8] mb-1">{stat.label}</p>
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xl font-bold",
                  stat.color === 'teal' && "text-[#0891B2]",
                  stat.color === 'gold' && "text-[#D97706]",
                  stat.color === 'navy' && "text-[#0F172A]"
                )}>
                  {stat.value}
                </span>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  stat.trend >= 0 
                    ? "bg-green-100 text-green-600" 
                    : "bg-red-100 text-red-600"
                )}>
                  {stat.trend >= 0 ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <ArrowDownRight size={12} />
                  )}
                  {Math.abs(stat.trend)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-[320px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white/5/50 border-t border-[rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#475569]">
            Last updated: <span className="text-[#475569] font-medium">Today at 2:30 PM</span>
          </p>
          <div className="flex items-center gap-4">
            <button className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1">
              View Detailed Report
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}