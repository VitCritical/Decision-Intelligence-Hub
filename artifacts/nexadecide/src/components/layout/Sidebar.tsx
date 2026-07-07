import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Lightbulb, 
  GitBranch, 
  TrendingUp, 
  Zap, 
  MessageSquare, 
  Bell, 
  Settings 
} from 'lucide-react';
import { useListAlerts, getListAlertsQueryKey, useGetDashboard, getGetDashboardQueryKey } from '@workspace/api-client-react';

export default function Sidebar() {
  const [location] = useLocation();
  
  const { data: alerts } = useListAlerts(
    { isRead: false }, 
    { query: { queryKey: getListAlertsQueryKey({ isRead: false }) } }
  );
  
  const { data: dashboard } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });
  
  const unreadAlertsCount = alerts?.filter(a => !a.isRead).length || 0;

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/insights', icon: Lightbulb, label: 'Smart Insights' },
    { href: '/root-cause', icon: GitBranch, label: 'Root Cause' },
    { href: '/forecast', icon: TrendingUp, label: 'Forecasting' },
    { href: '/recommendations', icon: Zap, label: 'Recommendations' },
    { href: '/chat', icon: MessageSquare, label: 'AI Chat' },
    { href: '/alerts', icon: Bell, label: 'Alerts', badge: unreadAlertsCount },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      <div className="h-[64px] flex items-center px-6 border-b border-sidebar-border">
        <div className="text-xl font-bold tracking-tight">
          <span className="text-white">Nexa</span>
          <span className="text-primary">Decide</span>
        </div>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto px-4">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="ml-auto bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
      
      {dashboard && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-card rounded-lg p-3 border border-border flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-primary/20 border border-primary/30">
              <span className="text-primary font-bold text-sm">{dashboard.healthScore.overall}</span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Health Score</div>
              <div className="text-sm font-medium text-white">Arjun Gen Store</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
