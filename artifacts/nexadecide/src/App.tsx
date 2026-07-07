import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import RootCause from './pages/RootCause';
import Forecast from './pages/Forecast';
import Recommendations from './pages/Recommendations';
import Chat from './pages/Chat';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/insights" component={Insights} />
        <Route path="/root-cause" component={RootCause} />
        <Route path="/forecast" component={Forecast} />
        <Route path="/recommendations" component={Recommendations} />
        <Route path="/chat" component={Chat} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
