import { QRCodeSVG } from "qrcode.react";
import { useQrStatus, useRefreshQr } from "@/hooks/use-qr";
import { Loader2, CheckCircle2, RefreshCw, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function QrPage() {
  const { data, isLoading, error } = useQrStatus();
  const { mutate: refreshQr, isPending: isRefreshing } = useRefreshQr();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
          <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
        </div>
        <p className="mt-4 text-muted-foreground font-display tracking-widest text-sm">
          ESTABLISHING SPIRIT CONNECTION...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-destructive">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold font-display">Connection Severed</h2>
        <p className="text-muted-foreground mt-2">The spiritual link has been broken.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-background">
      <AnimatePresence mode="wait">
        {data?.status === 'CONNECTED' ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
              <CheckCircle2 className="w-24 h-24 text-green-500 relative z-10" />
            </div>
            <h2 className="text-3xl font-bold text-green-400 font-display tracking-widest">CONNECTED</h2>
            <p className="text-muted-foreground">The Astral Bot is active and monitoring the realm.</p>
          </motion.div>
        ) : data?.qrCode ? (
          <motion.div
            key="qr"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-8"
          >
            <div className="p-6 bg-white rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-transform hover:scale-[1.02]">
              <QRCodeSVG value={data.qrCode} size={300} level="H" includeMargin={true} />
            </div>
            <div className="text-center space-y-6">
              <p className="text-muted-foreground font-display tracking-[0.2em] text-sm uppercase animate-pulse">
                Scan to bind your soul
              </p>
              <Button 
                onClick={() => refreshQr()} 
                disabled={isRefreshing}
                variant="outline"
                size="lg"
                className="min-w-[200px] h-14 border-primary/50 text-primary hover:bg-primary/10 rounded-xl transition-all font-display tracking-widest"
              >
                <RefreshCw className={`w-5 h-5 mr-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'REFRESHING...' : 'REFRESH GLYPH'}
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
            </div>
            <p className="text-lg text-muted-foreground font-display tracking-[0.3em] animate-pulse">
              AWAKENING...
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
