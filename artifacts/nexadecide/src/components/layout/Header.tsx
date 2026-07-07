import React from 'react';
import { useLocation, Link } from 'wouter';
import { Bell, Sparkles } from 'lucide-react';
import { useListAlerts, getListAlertsQueryKey } from '@workspace/api-client-react';

export default function Header() {
  const [location] = useLocation();
  
  const { data: alerts } = useListAlerts(
    { isRead: false }, 
    { query: { queryKey: getListAlertsQueryKey({ isRead: false }) } }
  );
  
  const unreadAlertsCount = alerts?.filter(a => !a.isRead).length || 0;

  const getPageTitle = () => {
    if (location === '/') return 'Dashboard';
    if (location.startsWith('/insights')) return 'Smart Insights';
    if (location.startsWith('/root-cause')) return 'Root Cause Analysis';
    if (location.startsWith('/forecast')) return 'Forecasting';
    if (location.startsWith('/recommendations')) return 'Recommendations';
    if (location.startsWith('/chat')) return 'AI Chat';
    if (location.startsWith('/alerts')) return 'Alerts Center';
    if (location.startsWith('/settings')) return 'Settings';
    return '';
  };

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[64px] bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 z-40">
      <h1 className="text-xl font-semibold text-white">{getPageTitle()}</h1>
      
      <div className="flex items-center gap-4">
        <Link href="/alerts" className="relative p-2 text-muted-foreground hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Bell className="w-5 h-5" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
          )}
        </Link>
        
        <Link href="/chat" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors text-sm shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          <Sparkles className="w-4 h-4" />
          Ask AI
        </Link>
      </div>
    </header>
  );
}
