import React from 'react';
import { useGetDashboard, getGetDashboardQueryKey, useSeedMetrics, useGenerateInsights } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Database, RefreshCcw, ShieldAlert, Cpu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });

  const seedMutation = useSeedMetrics({
    mutation: {
      onSuccess: () => {
        toast({ title: "Demo data reseeded successfully" });
        queryClient.invalidateQueries();
      }
    }
  });

  const insightsMutation = useGenerateInsights({
    mutation: {
      onSuccess: () => {
        toast({ title: "AI Insights regenerated globally" });
        queryClient.invalidateQueries();
      }
    }
  });

  const handleReseed = () => {
    if (confirm("Are you sure you want to reset all data to the initial demo state? This cannot be undone.")) {
      seedMutation.mutate();
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-10">
      
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Platform Settings</h2>
        <p className="text-muted-foreground">Manage your business profile and Nexa AI parameters</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Business Profile</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Name</label>
            <input type="text" disabled value="Arjun General Store" className="w-full bg-background border border-border text-white rounded-md px-3 py-2 opacity-70 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Industry Sector</label>
            <div className="flex gap-2">
              <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded-md text-sm font-medium">Retail</span>
              <span className="bg-background border border-border text-muted-foreground px-3 py-2 rounded-md text-sm font-medium">FMCG</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current System Status</label>
            <div className="bg-background border border-border rounded-md p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse"></div>
                <span className="text-sm text-white">Nexa AI Engine Online</span>
              </div>
              <div className="text-sm font-medium">
                Health Score: <span className="text-primary ml-1">{dashboard?.healthScore?.overall || '--'} / 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4 text-destructive">
          <ShieldAlert className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Danger Zone & Admin Actions</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-background/50">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /> Global AI Regeneration</h4>
              <p className="text-xs text-muted-foreground mt-1">Force the AI engine to regenerate all insights, forecasts, and recommendations across the platform.</p>
            </div>
            <button 
              onClick={() => insightsMutation.mutate()}
              disabled={insightsMutation.isPending}
              className="shrink-0 px-4 py-2 bg-secondary border border-border hover:bg-white/10 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${insightsMutation.isPending ? 'animate-spin' : ''}`} /> Run AI Pipeline
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div>
              <h4 className="text-sm font-semibold text-destructive flex items-center gap-2"><Database className="w-4 h-4" /> Factory Reset Demo Data</h4>
              <p className="text-xs text-muted-foreground mt-1">Wipe current state and reseed with fresh demo anomalies, alerts, and historical data.</p>
            </div>
            <button 
              onClick={handleReseed}
              disabled={seedMutation.isPending}
              className="shrink-0 px-4 py-2 bg-destructive hover:bg-destructive/90 text-white rounded-md text-sm font-medium transition-colors"
            >
              Reseed Database
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
