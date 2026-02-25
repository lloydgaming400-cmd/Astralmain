import { QRCodeSVG } from "qrcode.react";
import { useQrStatus, useRefreshQr } from "@/hooks/use-qr";
import { Loader2, CheckCircle2, RefreshCw, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
export default function QrPage() {
  const { data, error } = useQrStatus();
  const { mutate: refreshQr, isPending: isRefreshing } = useRefreshQr();
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
      <div className="flex flex-col items-center space-y-8">
        <div className="p-6 bg-white rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
          {data?.qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <QRCodeSVG value={data.qrCode} size={300} level="H" includeMargin={true} />
              <div className="p-2 bg-muted rounded text-[10px] font-mono break-all max-w-[300px] text-center opacity-50">
                {data.qrCode.substring(0, 100)}...
              </div>
            </div>
          ) : data?.status === 'CONNECTED' ? (
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted/50 border-2 border-primary/20 rounded-xl">
              <CheckCircle2 className="w-16 h-16 text-primary animate-pulse" />
            </div>
          ) : (
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted">
              <Smartphone className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="text-center space-y-6">
          <p className="text-muted-foreground font-display tracking-[0.2em] text-sm uppercase">
            {data?.status === 'CONNECTED' ? 'CONNECTED - SCAN TO RECONNECT' : 'Scan to bind your soul'}
          </p>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={() => refreshQr()} 
              disabled={isRefreshing}
              variant="outline"
              size="lg"
              className="min-w-[200px] h-14 border-primary/50 text-primary hover:bg-primary/10 rounded-xl transition-all font-display tracking-widest"
            >
              <RefreshCw className={w-5 h-5 mr-3 ${isRefreshing ? 'animate-spin' : ''}} />
              {isRefreshing ? 'REFRESHING...' : 'DISCONNECT & REFRESH'}
            </Button>
            <Button 
              onClick={() => refreshQr()} 
              disabled={isRefreshing}
              variant="default"
              size="lg"
              className="min-w-[200px] h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all font-display tracking-widest shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              CREATE QR CODE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
