import { isAiAvailable } from "@/lib/server/config";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { aiAvailable: isAiAvailable() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
