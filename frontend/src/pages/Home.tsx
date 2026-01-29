import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard-v3");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (!loading && isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
        </div>
      </header>

      <main className="container flex-1 flex flex-col items-center justify-center py-16">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-foreground">
            Welcome
          </h2>
          <p className="text-muted-foreground mb-8">
            Sign in or create an account to access the dashboard and file browser.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Zap className="w-5 h-5" />
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-11 px-8 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-border text-center text-muted-foreground text-sm">
        <p>Designed by Hammad Rustam</p>
      </footer>
    </div>
  );
}
