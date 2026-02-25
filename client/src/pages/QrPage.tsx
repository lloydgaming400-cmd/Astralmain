import { QRCodeSVG } from "qrcode.react";
import { useQrStatus, useRefreshQr } from "@/hooks/use-qr";
import { Loader2, CheckCircle2, RefreshCw, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

export default function QrPage() {
  const { data, error } = useQrStatus();
  const { mutate: refreshQr, isPending: isRefreshing } = useRefreshQr();
  const hasAutoTriggered = useRef(false);

  // Auto-trigger QR generation on first load if not connected
  useEffect(() => {
    if (
      !hasAutoTriggered.current &&
      data !== undefined &&
      data?.status !== "CONNECTED" &&
      !data?.qrCode
    ) {
      hasAutoTriggered.current = true;
      refreshQr();
    }
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-destructive">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold font-display">Connection Severed</h2>
        <p className="text-muted-foreground mt-2">The spiritual link has been broken.</p>
        <Button onClick={() => refreshQr()} className="mt-4">Retry</Button>
      </div>
    );
  }

  const isConnected = data?.status === "CONNECTED";
  const isWaiting = !data?.qrCode && !isConnected;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-background">
      <div className="flex flex-col items-center space-y-8">
        <div className="p-6 bg-white rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">

          {/* QR Code ready */}
          {data?.qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <QRCodeSVG value={data.qrCode} size={300} level="H" includeMargin={true} />
              <div className="p-2 bg-muted rounded text-[10px] font-mono break-all max-w-[300px] text-center opacity-50">
                {data.qrCode.substring(0, 100)}...
              </div>
            </div>
          ) : isConnected ? (
            /* Already connected */
            <div className="w-[300px] h-[300px] flex flex-col items-center justify-center gap-4 bg-muted/50 border-2 border-primary/20 rounded-xl">
              <CheckCircle2 className="w-16 h-16 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground font-display tracking-widest">CONNECTED</p>
            </div>
          ) : (
            /* Waiting for QR to generate */
            <div className="w-[300px] h-[300px] flex flex-col items-center justify-center gap-4 bg-muted rounded-xl">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-display tracking-widest text-center px-4">
                {isRefreshing ? "GENERATING QR..." : "CONNECTING TO REALM..."}
              </p>
            </div>
          )}
        </div>

        <div className="text-center space-y-6">
          <p className="text-muted-foreground font-display tracking-[0.2em] text-sm uppercase">
            {isConnected
              ? "CONNECTED — SCAN TO RECONNECT"
              : data?.qrCode
              ? "Scan to bind your soul"
              : "Awaiting the gate..."}
          </p>

          <div className="flex flex-col gap-4">
            <Button
              onClick={() => refreshQr()}
              disabled={isRefreshing}
              variant="outline"
              size="lg"
              className="min-w-[200px] h-14 border-primary/50 text-primary hover:bg-primary/10 rounded-xl transition-all font-display tracking-widest"
            >
              <RefreshCw className={`w-5 h-5 mr-3 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "REFRESHING..." : "DISCONNECT & REFRESH"}
            </Button>

            <Button
              onClick={() => refreshQr()}
              disabled={isRefreshing}
              variant="default"
              size="lg"
              className="min-w-[200px] h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all font-display tracking-widest shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              {isRefreshing ? (
                <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> GENERATING...</>
              ) : (
                "CREATE QR CODE"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
