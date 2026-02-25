import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

// GET /api/qr/status
export function useQrStatus() {
  return useQuery({
    queryKey: [api.qr.status.path],
    queryFn: async () => {
      const res = await fetch(api.qr.status.path);
      if (!res.ok) throw new Error("Failed to fetch QR status");
      return api.qr.status.responses[200].parse(await res.json());
    },
    // FIX: Poll every 3s when waiting for QR/connection, slow down when already connected
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "CONNECTED") return 10000; // slow poll when connected
      return 3000; // fast poll when waiting for QR or disconnected
    },
    // FIX: retry on error with backoff instead of hammering server
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

// POST /api/qr/refresh
export function useRefreshQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.qr.refresh.path, {
        method: api.qr.refresh.method,
      });
      if (!res.ok) throw new Error("Failed to refresh QR code");
      return api.qr.refresh.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // FIX: Invalidate immediately AND refetch to pick up new QR code
      queryClient.invalidateQueries({ queryKey: [api.qr.status.path] });
      queryClient.refetchQueries({ queryKey: [api.qr.status.path] });
    },
  });
}
