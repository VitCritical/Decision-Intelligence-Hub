import React, { useEffect, useState } from 'react';
import { useGetDashboard, getGetDashboardQueryKey } from '@workspace/api-client-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, AlertCircle, Info, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { format } from 'date-fns';

const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });

  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (dashboard?.healthScore?.overall) {
      let start = 0;
      const end = dashboard.healthScore.overall;
      const duration = 1500;
      const incrementTime = 30;
      const steps = duration / incrementTime;
      const stepValue = end / steps;

      const timer = setInterval(() => {
        start += stepValue;
        if (start >= end) {
          setAnimatedScore(end);
          clearInterval(timer);
        } else {
          setAnimatedScore(Math.floor(start));
        }
      }, incrementTime);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [dashboard?.healthScore?.overall]);

  if (isLoading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Analyzing Business Data...</p>
        </div>
      </div>
    );
  }

  const { healthScore, topInsights, topAlerts, forecastPreview, salesLast7Days } = dashboard;

  const renderTrendIcon = (trend: string, className = "w-4 h-4") => {
    if (trend === 'up') return <ArrowUpRight className={`${className} text-success`} />;
    if (trend === 'down') return <ArrowDownRight className={`${className} text-destructive`} />;
    return <Minus className={`${className} text-muted-foreground`} />;
  };

  const getSeverityColor = (sev: string) => {
    if (sev === 'critical') return 'text-destructive';
    if (sev === 'warning') return 'text-warning';
    if (sev === 'positive') return 'text-success';
    return 'text-primary';
  };

  const getSeverityBg = (sev: string) => {
    if (sev === 'critical') return 'bg-destructive/10 border-destructive/20';
    if (sev === 'warning') return 'bg-warning/10 border-warning/20';
    if (sev === 'positive') return 'bg-success/10 border-success/20';
    return 'bg-primary/10 border-primary/20';
  };

  return (
    <div className="grid grid-cols-12 gap-6 pb-20">
      
      {/* Top Row: Health Score & Sub-scores */}
      <div className="col-span-12 lg:col-span-4 bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary"></div>
        <h2 className="text-lg font-medium text-white mb-6 self-start w-full">Overall Health</h2>
        
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" cy="50%" innerRadius="80%" outerRadius="100%" 
              barSize={10} data={[{ name: 'Score', value: animatedScore, fill: '#6366F1' }]} 
              startAngle={90} endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: '#1F2937' }} dataKey="value" cornerRadius={5} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white">{animatedScore}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        
        <p className="mt-6 text-center text-sm text-muted-foreground max-w-[250px]">
          {healthScore.summary}
        </p>
      </div>

      <div className="col-span-12 lg:col-span-8 bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-6">Health Factors</h2>
        <div className="space-y-5">
          {[
            { key: 'sales', data: healthScore.sales },
            { key: 'inventory', data: healthScore.inventory },
            { key: 'finance', data: healthScore.finance },
            { key: 'customer', data: healthScore.customer },
            { key: 'operations', data: healthScore.operations }
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-muted-foreground capitalize">{item.key}</div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${item.data.score}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full rounded-full ${
                    item.data.score > 70 ? 'bg-success' : item.data.score > 40 ? 'bg-warning' : 'bg-destructive'
                  }`}
                />
              </div>
              <div className="w-16 text-right flex items-center justify-end gap-1">
                <span className="text-sm font-bold text-white">{item.data.score}</span>
                {renderTrendIcon(item.data.trend)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Row: Sales Chart & Forecast */}
      <div className="col-span-12 lg:col-span-8 bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white">7-Day Revenue</h2>
          <Link href="/forecast" className="text-xs text-primary hover:underline flex items-center gap-1">
            View Forecast <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesLast7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '8px' }}
                itemStyle={{ color: '#F9FAFB' }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
              />
              <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-6">Forecast Preview</h2>
        <div className="grid grid-cols-2 gap-3">
          {forecastPreview.map((item, i) => (
            <div key={i} className="bg-background border border-border rounded-lg p-3">
              <div className="text-xs text-muted-foreground capitalize mb-1">{item.metric}</div>
              <div className="flex items-end gap-2 mb-2">
                <div className="text-lg font-bold text-white">
                  {item.unit === 'currency' ? formatCurrency(Number(item.value)) : item.value}
                </div>
                {renderTrendIcon(item.trend, "w-5 h-5 mb-0.5")}
              </div>
              <div className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
                {item.confidence}% confidence
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Top Insights & Alerts */}
      <div className="col-span-12 lg:col-span-6 bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Top Insights</h2>
          <Link href="/insights" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        <div className="space-y-3">
          {topInsights.map((insight) => (
            <div key={insight.id} className={`p-4 rounded-lg border-l-4 border-y border-r border-y-border border-r-border bg-background ${
              insight.severity === 'critical' ? 'border-l-destructive' : 
              insight.severity === 'warning' ? 'border-l-warning' : 
              'border-l-success'
            }`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${getSeverityBg(insight.severity)} ${getSeverityColor(insight.severity)}`}>
                  {insight.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{insight.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6 bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Active Alerts</h2>
          <Link href="/alerts" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {topAlerts.map((alert) => (
            <div key={alert.id} className={`flex items-center gap-2 px-3 py-2 rounded-full border ${getSeverityBg(alert.severity)}`}>
              {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-destructive" /> :
               alert.severity === 'warning' ? <AlertCircle className="w-4 h-4 text-warning" /> :
               <Info className="w-4 h-4 text-primary" />}
              <span className={`text-xs font-medium ${getSeverityColor(alert.severity)}`}>{alert.title}</span>
            </div>
          ))}
          {topAlerts.length === 0 && (
            <div className="text-sm text-muted-foreground w-full text-center py-4">No active alerts right now.</div>
          )}
        </div>
      </div>

      <Link href="/chat" className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-transform hover:scale-105 z-50">
        <Sparkles className="w-6 h-6" />
      </Link>
    </div>
  );
}
