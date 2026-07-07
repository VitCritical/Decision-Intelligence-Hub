import React, { useState } from 'react';
import { useListRecommendations, getListRecommendationsQueryKey, useUpdateRecommendation } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Zap, Target, TrendingUp, Check, X, Clock, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Recommendations() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress'>('all');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams: any = {};
  if (filterStatus !== 'all') queryParams.status = filterStatus;
  if (filterUrgency !== 'all') queryParams.urgency = filterUrgency;

  const { data: recommendations, isLoading } = useListRecommendations(
    queryParams,
    { query: { queryKey: getListRecommendationsQueryKey(queryParams) } }
  );

  const updateMutation = useUpdateRecommendation({
    mutation: {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
      }
    }
  });

  const handleStatusChange = (id: number, status: 'pending' | 'in_progress' | 'done' | 'dismissed') => {
    updateMutation.mutate({ id, data: { status } });
  };

  const getUrgencyBadge = (urgency: string) => {
    if (urgency === 'high') return <span className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">High Priority</span>;
    if (urgency === 'medium') return <span className="bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Med Priority</span>;
    return <span className="bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Low Priority</span>;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Action Plan
        </h2>
        
        <div className="flex gap-4 bg-card border border-border p-1.5 rounded-lg">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-transparent text-sm text-white focus:outline-none px-2"
          >
            <option value="all" className="bg-card">All Status</option>
            <option value="pending" className="bg-card">Pending</option>
            <option value="in_progress" className="bg-card">In Progress</option>
          </select>
          <div className="w-px h-5 bg-border my-auto"></div>
          <select 
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value as any)}
            className="bg-transparent text-sm text-white focus:outline-none px-2"
          >
            <option value="all" className="bg-card">All Urgency</option>
            <option value="high" className="bg-card">High</option>
            <option value="medium" className="bg-card">Medium</option>
            <option value="low" className="bg-card">Low</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Zap className="w-8 h-8 text-primary animate-pulse" />
        </div>
      ) : !recommendations || recommendations.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No actionable recommendations right now.</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {recommendations.map(rec => (
            <motion.div 
              key={rec.id} 
              variants={itemVariants}
              className={`bg-card rounded-xl p-6 relative overflow-hidden transition-all duration-300 group hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] ${rec.status === 'done' || rec.status === 'dismissed' ? 'opacity-60' : ''}`}
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${rec.urgency === 'high' ? 'from-destructive to-destructive/50' : rec.urgency === 'medium' ? 'from-warning to-warning/50' : 'from-success to-success/50'}`}></div>
              
              <div className="flex justify-between items-start mb-4">
                {getUrgencyBadge(rec.urgency)}
                <div className="text-[10px] text-muted-foreground/60">
                  {format(new Date(rec.generatedAt), 'MMM d, h:mm a')}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-primary transition-colors">{rec.problemStatement}</h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2">Because: {rec.rootCause}</p>

              <div className="bg-background/50 border border-border rounded-lg p-4 mb-6">
                <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Recommended Action</div>
                <p className="text-sm text-white font-medium">{rec.action}</p>
              </div>

              <div className="flex items-end justify-between mt-auto">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Expected Impact</div>
                  <div className="flex items-center gap-1.5 text-success font-bold text-sm bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
                    <TrendingUp className="w-3.5 h-3.5" /> +{rec.expectedImpactPercent}%
                  </div>
                </div>

                <div className="flex gap-2">
                  {rec.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleStatusChange(rec.id, 'dismissed')}
                        className="p-2 text-muted-foreground hover:bg-white/5 hover:text-white rounded-md transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(rec.id, 'in_progress')}
                        className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                      >
                        <PlayCircle className="w-4 h-4" /> Start
                      </button>
                    </>
                  )}
                  {rec.status === 'in_progress' && (
                    <button 
                      onClick={() => handleStatusChange(rec.id, 'done')}
                      className="flex items-center gap-1.5 bg-success/10 hover:bg-success/20 text-success border border-success/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    >
                      <Check className="w-4 h-4" /> Mark Done
                    </button>
                  )}
                  {rec.status === 'done' && (
                    <span className="flex items-center gap-1.5 text-success text-sm font-medium px-3 py-1.5">
                      <Check className="w-4 h-4" /> Completed
                    </span>
                  )}
                </div>
              </div>

            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
