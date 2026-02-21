import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import QrPage from "@/pages/QrPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground md:pl-64">
      <Navigation />
      <main className="p-4 md:p-8 lg:p-12 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
        <Switch>
          <Route path="/" component={() => <Redirect to="/qr" />} />
          <Route path="/qr" component={QrPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
