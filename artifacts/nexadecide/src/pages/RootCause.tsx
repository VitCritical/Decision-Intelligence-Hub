import React, { useState, useEffect } from 'react';
import { useGetRootCause, getGetRootCauseQueryKey } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { GitBranch, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { ComposedChart, Area, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

export default function RootCause() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const metricParam = searchParams.get('metric');
  
  const [selectedMetric, setSelectedMetric] = useState(metricParam || 'revenue');

  const { data: rootCauseData, isLoading } = useGetRootCause(
    selectedMetric,
    { query: { enabled: !!selectedMetric, queryKey: getGetRootCauseQueryKey(selectedMetric) } }
  );

  const metrics = [
    { id: 'revenue', label: 'Total Revenue' },
    { id: 'inventory_turnover', label: 'Inventory Turnover' },
    { id: 'customer_retention', label: 'Customer Retention' },
    { id: 'operating_expenses', label: 'Operating Expenses' }
  ];

  const getLikelihoodColor = (likelihood: string) => {
    if (likelihood === 'high') return 'bg-destructive/10 border-destructive text-destructive';
    if (likelihood === 'medium') return 'bg-warning/10 border-warning text-warning';
    return 'bg-success/10 border-success text-success';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-4 rounded-xl">
        <div>
          <h2 className="text-lg font-semibold text-white">Root Cause Analysis</h2>
          <p className="text-sm text-muted-foreground">Deep dive into anomalies and their drivers</p>
        </div>
        
        <div className="relative min-w-[200px]">
          <select 
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="w-full appearance-none bg-background border border-border text-white text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            {metrics.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex items-center justify-center bg-card border border-border rounded-xl">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <GitBranch className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-muted-foreground text-sm">Analyzing multidimensional data...</p>
          </div>
        </div>
      ) : !rootCauseData ? (
        <div className="h-[400px] flex items-center justify-center bg-card border border-border rounded-xl text-muted-foreground">
          <p>No analysis data available for this metric.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <h3 className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">The Verdict</h3>
              <p className="text-2xl font-bold text-white leading-snug">
                {rootCauseData.rootCause}
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 text-sm text-muted-foreground">
                {rootCauseData.anomalySummary}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-6">Historical Anomaly Map</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rootCauseData.historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '8px' }}
                      itemStyle={{ color: '#F9FAFB' }}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorMetric)" />
                    <Scatter dataKey="value" shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.isAnomaly) {
                        return <circle cx={cx} cy={cy} r={6} fill="#EF4444" stroke="#111827" strokeWidth={2} />;
                      }
                      return <circle cx={cx} cy={cy} r={0} />;
                    }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary/30 border border-primary"></div> Normal Trend</span>
                <span className="flex items-center gap-1 ml-4"><div className="w-3 h-3 rounded-full bg-destructive border border-card"></div> Anomaly Detected</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">Contributing Factors</h3>
              <div className="space-y-3">
                {rootCauseData.contributors.map((contributor, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-l-2 bg-background/50 border-border ${getLikelihoodColor(contributor.likelihood)}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-white">{contributor.factor}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-current/10">
                        {contributor.likelihood}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{contributor.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-semibold">AI Recommendation</h3>
              </div>
              <p className="text-sm text-white/90 leading-relaxed">
                {rootCauseData.recommendation}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
