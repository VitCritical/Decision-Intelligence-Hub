import React, { useState } from 'react';
import { useListForecasts, getListForecastsQueryKey, useGenerateForecasts } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RefreshCcw, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const formatValue = (val: number, unit: string) => {
  if (unit === 'currency') return `₹${val.toLocaleString('en-IN')}`;
  if (unit === 'percentage') return `${val}%`;
  return val.toLocaleString('en-IN');
};

export default function Forecast() {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'expenses' | 'cashflow'>('sales');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forecasts, isLoading } = useListForecasts({
    query: { queryKey: getListForecastsQueryKey() }
  });

  const generateMutation = useGenerateForecasts({
    mutation: {
      onSuccess: () => {
        toast({ title: "Forecasts updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListForecastsQueryKey() });
      },
      onError: () => toast({ title: "Failed to generate forecasts", variant: "destructive" })
    }
  });

  if (isLoading || !forecasts) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <TrendingUp className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-muted-foreground">Generating ML Forecasts...</p>
        </div>
      </div>
    );
  }

  const currentSeries = forecasts[activeTab];

  // Map data for recharts
  const chartData = currentSeries.points.map(p => ({
    date: p.forecastDate,
    historical: p.isHistorical ? p.predictedValue : null,
    predicted: !p.isHistorical ? p.predictedValue : null,
    confidenceRange: !p.isHistorical ? [p.lowerBound, p.upperBound] : null,
    isHistorical: p.isHistorical
  }));

  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-card border border-border p-1 rounded-lg">
          {(['sales', 'inventory', 'expenses', 'cashflow'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-card text-white border border-border hover:border-primary/50 hover:bg-card/80 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
          Recalculate Models
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium text-white capitalize">{currentSeries.metricName} Projection</h2>
              <p className="text-sm text-muted-foreground">30-day forward looking model</p>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs font-bold text-primary">{currentSeries.overallConfidence}% Confidence</span>
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => format(new Date(val), 'MMM d')} 
                  stroke="#6B7280" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#6B7280" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => formatValue(val, currentSeries.unit).replace('₹', '')}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '8px' }}
                  itemStyle={{ color: '#F9FAFB' }}
                  labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                  formatter={(value: any, name: string) => {
                    if (name === 'confidenceRange') return null; // hide array
                    return [formatValue(Number(value), currentSeries.unit), name === 'historical' ? 'Actual' : 'Predicted'];
                  }}
                />
                {/* Confidence Band */}
                <Area 
                  type="monotone" 
                  dataKey="confidenceRange" 
                  stroke="none" 
                  fill="#6366F1" 
                  fillOpacity={0.1} 
                />
                {/* Historical Line */}
                <Line 
                  type="monotone" 
                  dataKey="historical" 
                  stroke="#F9FAFB" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, fill: '#F9FAFB', stroke: '#111827' }}
                />
                {/* Predicted Line (Dashed) */}
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#6366F1" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366F1', stroke: '#111827' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border text-sm text-muted-foreground justify-center">
            <span className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-white"></div> Actual Data
            </span>
            <span className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-primary"></div> AI Projection
            </span>
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary/10 border border-primary/20 rounded-sm"></div> Confidence Band
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3 text-white font-medium">
              <Info className="w-4 h-4 text-primary" />
              AI Analyst Notes
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentSeries.aiCommentary}
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5 flex-1">
             <div className="flex items-center gap-2 mb-4 text-white font-medium">
              <AlertCircle className="w-4 h-4 text-warning" />
              Risk Factors
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0"></div>
                <span className="text-muted-foreground">Market volatility is slightly higher than 30-day average.</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0"></div>
                <span className="text-muted-foreground">Local holiday next week may skew {activeTab} volume.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
