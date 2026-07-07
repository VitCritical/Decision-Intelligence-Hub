import React from 'react';
import { useListAlerts, getListAlertsQueryKey, useMarkAlertRead } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, Info, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Alerts() {
  const queryClient = useQueryClient();
  
  const { data: alerts, isLoading } = useListAlerts({}, {
    query: { queryKey: getListAlertsQueryKey() }
  });

  const markReadMutation = useMarkAlertRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Sort by critical first, then unread, then date
  const sortedAlerts = [...(alerts || [])].sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  const getSeverityStyles = (severity: string) => {
    if (severity === 'critical') return { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive' };
    if (severity === 'warning') return { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning' };
    return { icon: Info, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary' };
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Alerts Center</h2>
        <p className="text-muted-foreground">Monitor and manage critical business events</p>
      </div>

      {!sortedAlerts.length ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-4 text-success opacity-50" />
          <p>All clear. No active alerts right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {sortedAlerts.map(alert => {
              const style = getSeverityStyles(alert.severity);
              const Icon = style.icon;
              
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden ${!alert.isRead && alert.severity === 'critical' ? 'animate-pulse-critical' : ''} ${alert.isRead ? 'opacity-60' : ''}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bg} ${!alert.isRead ? style.bg.replace('/10', '') : ''}`} />
                  
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${style.bg} ${style.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white truncate">{alert.title}</h3>
                      {!alert.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{alert.explanation}</p>
                    
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="bg-background border border-border px-2 py-1 rounded flex items-center gap-2">
                        <span className="text-muted-foreground">{alert.metricName}</span>
                        <span className="font-mono font-bold text-white">{alert.metricValue}</span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className="font-mono text-muted-foreground">{alert.threshold} limit</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground/70">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(alert.triggeredAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  {!alert.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate({ id: alert.id })}
                      disabled={markReadMutation.isPending}
                      className="shrink-0 w-full sm:w-auto px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Acknowledge
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
