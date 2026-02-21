import { z } from 'zod';
import { users, sects } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  qr: {
    status: {
      method: 'GET' as const,
      path: '/api/qr/status' as const,
      responses: {
        200: z.object({
          status: z.enum(["CONNECTED", "DISCONNECTED", "WAITING_FOR_QR"]),
          qrCode: z.string().optional()
        })
      }
    },
    refresh: {
      method: 'POST' as const,
      path: '/api/qr/refresh' as const,
      responses: {
        200: z.object({ success: z.boolean() })
      }
    }
  },
  stats: {
    leaderboard: {
      method: 'GET' as const,
      path: '/api/stats/leaderboard' as const,
      responses: {
        200: z.object({
          users: z.array(z.custom<typeof users.$inferSelect>()),
          sects: z.array(z.custom<typeof sects.$inferSelect>())
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
