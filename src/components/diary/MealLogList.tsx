import { ImageOff, MessageSquareQuote } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { MealLog } from "@/generated/prisma/client";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { followedLabel, photoExpiresAt, ratingInfo } from "@/lib/meal-log";
import { FeedbackForm } from "./FeedbackForm";

/** Lista do diário. Para a nutricionista mostra o formulário de feedback. */
export function MealLogList({
  logs,
  viewer,
  nutritionistName,
}: {
  logs: MealLog[];
  viewer: "NUTRITIONIST" | "PATIENT";
  nutritionistName?: string;
}) {
  if (!logs.length) {
    return (
      <EmptyState
        title="Nenhuma refeição registrada"
        description={viewer === "PATIENT" ? "Use o formulário acima para registrar sua primeira refeição." : "Quando o paciente registrar refeições, elas aparecem aqui."}
      />
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const rating = ratingInfo(log.feedbackRating);
        const followed = followedLabel(log.followedPlan);
        const hasFeedback = log.feedback !== null;
        return (
          <Card key={log.id} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {log.photoPath ? (
                <a href={`/api/uploads/${log.photoPath}`} target="_blank" rel="noreferrer" className="shrink-0 sm:w-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/uploads/${log.photoPath}`}
                    alt={`Foto da refeição: ${log.mealType}`}
                    className="aspect-square h-full w-full object-cover"
                    loading="lazy"
                  />
                </a>
              ) : log.photoRemovedAt ? (
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:w-56 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:px-3 sm:text-center">
                  <ImageOff className="h-5 w-5 shrink-0 text-slate-400" />
                  <span>Foto removida em {fmtDate(log.photoRemovedAt)}. As fotos ficam guardadas por tempo limitado.</span>
                </div>
              ) : null}
              <div className="flex-1 space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{log.mealType}</p>
                    <p className="text-xs text-slate-500">{fmtDateTime(log.date)}</p>
                    {viewer === "NUTRITIONIST" && log.photoPath ? (
                      <p className="text-xs text-slate-500">Foto guardada até {fmtDate(photoExpiresAt(log))}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {viewer === "NUTRITIONIST" && !hasFeedback ? <Badge tone="yellow">Aguardando feedback</Badge> : null}
                    {viewer === "PATIENT" ? (
                      <DeleteButton url={`/api/meal-logs/${log.id}`} confirmText="Apagar este registro do diário?" />
                    ) : null}
                  </div>
                </div>
                {log.description ? <p className="whitespace-pre-wrap text-sm text-slate-700">{log.description}</p> : null}
                <div className="flex flex-wrap gap-1.5">
                  {log.hunger !== null ? <Badge>Fome {log.hunger}/10</Badge> : null}
                  {log.satiety !== null ? <Badge>Saciedade {log.satiety}/10</Badge> : null}
                  {log.mood ? <Badge>{log.mood}</Badge> : null}
                  {followed ? (
                    <Badge tone={log.followedPlan === "SIM" ? "green" : log.followedPlan === "PARCIAL" ? "yellow" : "red"}>{followed}</Badge>
                  ) : null}
                </div>

                {hasFeedback ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                      <MessageSquareQuote className="h-3.5 w-3.5" />
                      {viewer === "PATIENT" ? `Feedback de ${nutritionistName ?? "sua nutricionista"}` : "Seu feedback"}
                      {rating ? <Badge tone={rating.tone}>{rating.label}</Badge> : null}
                    </p>
                    {log.feedback ? <p className="whitespace-pre-wrap text-slate-700">{log.feedback}</p> : null}
                  </div>
                ) : null}

                {viewer === "NUTRITIONIST" ? (
                  <FeedbackForm logId={log.id} initialFeedback={log.feedback} initialRating={log.feedbackRating} />
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
