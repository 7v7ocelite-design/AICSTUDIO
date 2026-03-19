import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineProgressEvent } from "@/lib/types";

export function ProgressTracker({
  events,
  isRunning
}: {
  events: PipelineProgressEvent[];
  isRunning: boolean;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Pipeline Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">
              Start generation to see real-time updates from the pipeline.
            </p>
          ) : null}
          {events.map((event, idx) => (
            <div
              key={`${event.step}-${idx}`}
              className="rounded-lg border border-border/60 bg-slate-900/40 p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium capitalize text-slate-100">
                  {event.step.replaceAll("_", " ")}
                </p>
                <Badge variant={event.step === "error" ? "danger" : "neutral"}>
                  {event.progress}%
                </Badge>
              </div>
              <p className="text-sm text-slate-300">{event.message}</p>
              {event.provider ? (
                <p className="mt-2 text-xs text-slate-400">Provider: {event.provider}</p>
              ) : null}
            </div>
          ))}
          {isRunning ? <p className="text-xs text-slate-500">Streaming updates via SSE...</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
