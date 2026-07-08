import React, { useState } from 'react';
import { 
  useListInsights, getListInsightsQueryKey, 
  useGenerateInsights, useMarkInsightRead,
  useMarkAllInsightsRead, useClearAllInsights
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCcw, Check, ArrowRight, Lightbulb, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName];
        const stringified = typeof value === 'object' && value !== null 
          ? JSON.stringify(value) 
          : String(value ?? '');
        return `"${stringified.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Insights() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'positive'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = filter === 'all' ? {} : { severity: filter };
  
  const { data: insights, isLoading } = useListInsights(
    queryParams,
    { query: { queryKey: getListInsightsQueryKey(queryParams) } }
  );

  const generateMutation = useGenerateInsights({
    mutation: {
      onSuccess: () => {
        toast({ title: "Insights generated successfully" });
        queryClient.invalidateQueries({ queryKey: getListInsightsQueryKey() });
      },
      onError: () => toast({ title: "Failed to generate insights", variant: "destructive" })
    }
  });

  const markReadMutation = useMarkInsightRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInsightsQueryKey() });
      }
    }
  });

  const readAllMutation = useMarkAllInsightsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInsightsQueryKey() });
      }
    }
  });

  const clearAllMutation = useClearAllInsights({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInsightsQueryKey() });
      }
    }
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const getBorderColor = (sev: string) => {
    if (sev === 'critical') return 'border-l-destructive';
    if (sev === 'warning') return 'border-l-warning';
    if (sev === 'positive') return 'border-l-success';
    return 'border-l-primary';
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-card border border-border p-1 rounded-lg">
          {['all', 'critical', 'warning', 'positive'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                filter === tab ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          {insights && insights.length > 0 && (
            <>
              <button
                onClick={() => {
                  const csvData = insights.map(({ id, severity, category, title, explanation, relatedMetric, generatedAt, isRead }) => ({
                    id, severity, category, title, explanation, relatedMetric, generatedAt, isRead
                  }));
                  exportToCSV(csvData, "insights.csv");
                }}
                className="px-3 py-2 bg-secondary border border-border hover:bg-white/10 text-white rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={() => readAllMutation.mutate()}
                disabled={readAllMutation.isPending}
                className="px-3 py-2 bg-secondary border border-border hover:bg-white/10 text-white rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark all read
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all insights?")) {
                    clearAllMutation.mutate();
                  }
                }}
                disabled={clearAllMutation.isPending}
                className="px-3 py-2 bg-destructive/20 hover:bg-destructive text-destructive hover:text-white border border-destructive/30 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            </>
          )}
          
          <button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white border border-border hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCcw className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            Regenerate with AI
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <Lightbulb className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading Insights...</p>
          </div>
        </div>
      ) : !insights || insights.length === 0 ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-muted-foreground">
          <Lightbulb className="w-12 h-12 opacity-20" />
          <p>No insights found for this filter.</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4"
        >
          {insights.map((insight) => (
            <motion.div 
              key={insight.id} 
              variants={itemVariants}
              className={`bg-card border-y border-r border-y-border border-r-border border-l-[4px] rounded-lg p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${getBorderColor(insight.severity)} ${insight.isRead ? 'opacity-70' : 'opacity-100'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                    {insight.category}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    insight.severity === 'critical' ? 'text-destructive bg-destructive/10' :
                    insight.severity === 'warning' ? 'text-warning bg-warning/10' :
                    'text-success bg-success/10'
                  }`}>
                    {insight.severity}
                  </span>
                  {!insight.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{insight.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.explanation}</p>
                <div className="text-xs text-muted-foreground/60 mt-3">
                  {format(new Date(insight.generatedAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                {!insight.isRead && (
                  <button 
                    onClick={() => markReadMutation.mutate({ id: insight.id })}
                    disabled={markReadMutation.isPending}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-white border border-border rounded hover:bg-white/5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark Read
                  </button>
                )}
                {insight.relatedMetric && (
                  <Link 
                    href={`/root-cause?metric=${insight.relatedMetric}`}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded transition-colors"
                  >
                    Dig Deeper <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
