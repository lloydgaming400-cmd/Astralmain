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
    refetchInterval: 3000, // Poll every 3 seconds
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
      queryClient.invalidateQueries({ queryKey: [api.qr.status.path] });
    },
  });
}
