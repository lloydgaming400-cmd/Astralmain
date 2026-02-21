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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-primary">
          Spirit Link
        </h1>
        <p className="text-muted-foreground">
          Connect your device to the Astral Realm to begin cultivation monitoring.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center mt-12">
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-8 rounded-3xl space-y-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors duration-500"></div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Device Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-muted-foreground">Connection State</span>
                <span className={`font-mono font-bold px-3 py-1 rounded-lg border ${
                  data?.status === 'CONNECTED' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                }`}>
                  {data?.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-muted-foreground">Session Type</span>
                <span className="text-foreground font-medium">Multi-Device</span>
              </div>
            </div>

            {data?.status === 'CONNECTED' && (
              <div className="mt-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-green-400">System Active</h3>
                  <p className="text-xs text-green-400/80">
                    Bot is monitoring messages and awarding XP.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* QR Code Area */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center justify-center space-y-6"
        >
          <AnimatePresence mode="wait">
            {data?.status === 'CONNECTED' ? (
              <motion.div
                key="connected"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-64 h-64 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-900/20 border border-green-500/30 flex items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-green-500/10 blur-xl animate-pulse"></div>
                <CheckCircle2 className="w-24 h-24 text-green-500 relative z-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
              </motion.div>
            ) : data?.qrCode ? (
              <motion.div
                key="qr"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="p-6 bg-white rounded-3xl shadow-[0_0_40px_rgba(147,51,234,0.15)] relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-[28px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <QRCodeSVG
                  value={data.qrCode}
                  size={240}
                  level="H"
                  includeMargin={true}
                  className="relative z-10"
                />
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                className="w-64 h-64 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center"
              >
                <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          {data?.status !== 'CONNECTED' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Scan this glyph with your WhatsApp mobile application to bind your soul to the bot.
              </p>
              
              <Button 
                onClick={() => refreshQr()} 
                disabled={isRefreshing}
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary-foreground transition-all duration-300 group"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                Regenerate Glyph
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
