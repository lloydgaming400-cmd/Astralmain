import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="glass-panel p-12 rounded-3xl text-center space-y-6 max-w-md mx-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        
        <h1 className="text-4xl font-display font-bold text-white">
          Void Realm
        </h1>
        
        <p className="text-muted-foreground">
          You have wandered too far into the chaos. This path does not exist.
        </p>

        <Link href="/qr" className="inline-block px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25">
          Return to Safety
        </Link>
      </div>
    </div>
  );
}
