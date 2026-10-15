"use client";

import Link from "next/link";
import { useState } from "react";

import { diagnosticAnswerOptions, diagnosticQuestions } from "@/lib/smme-diagnostic";

type Gap = { key: string; label: string; recommendedTypes: string[] };
type Recommendation = { id: string; title: string; type?: string; matchScore?: number; matchReason?: string };

export function SmmeDiagnosticWizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const question = diagnosticQuestions[step];

  const finish = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/smme-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save your readiness check.");

      const resultGaps = payload.diagnostic.gaps as Gap[];
      setScore(payload.diagnostic.score as number);
      setGaps(resultGaps);
      if (resultGaps.length) {
        const recommendationResponse = await fetch("/api/v1/recommendations/support-programmes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gaps: resultGaps.slice(0, 3).map((gap) => gap.key) }),
        });
        const recommendationPayload = await recommendationResponse.json();
        if (!recommendationResponse.ok) throw new Error(recommendationPayload.error ?? "Your check was saved, but support matches could not be loaded.");
        setRecommendations(recommendationPayload.opportunities as Recommendation[]);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your readiness check.");
    } finally {
      setIsSaving(false);
    }
  };

  if (score !== null && gaps) {
    return (
      <section className="space-y-5 rounded-2xl border border-forest/10 bg-white p-5" aria-labelledby="diagnostic-result">
        <h2 id="diagnostic-result" className="font-display text-2xl text-forest">Your business readiness</h2>
        <p className="text-4xl font-semibold text-forest">{score}<span className="text-lg"> / 100</span></p>
        <p className="text-inkSoft">{score >= 70 ? "You have a good foundation to build on." : score >= 40 ? "You have some strong foundations and a few areas to strengthen." : "A few practical steps can help your business get ready to grow."}</p>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div>
          <h3 className="font-semibold text-ink">Your top areas to work on</h3>
          {gaps.length ? (
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-inkSoft">
              {gaps.slice(0, 3).map((gap) => <li key={gap.key}>{gap.label}</li>)}
            </ol>
          ) : <p className="mt-2 text-sm text-inkSoft">No major gaps were found in this check.</p>}
        </div>
        <div>
          <h3 className="font-semibold text-ink">Recommended support programmes</h3>
          {recommendations.length ? (
            <ul className="mt-2 space-y-2">
              {recommendations.slice(0, 5).map((recommendation) => (
                <li key={recommendation.id} className="rounded-xl bg-cream p-3">
                  <Link href={`/opportunities/${recommendation.id}`} className="font-medium text-forest underline">{recommendation.title}</Link>
                  {recommendation.matchReason ? <p className="mt-1 text-sm text-inkSoft">{recommendation.matchReason}</p> : null}
                  <Link href={`/opportunities/${recommendation.id}#apply`} className="mt-2 inline-flex min-h-9 items-center justify-center rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-leaf">Apply now</Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-inkSoft">No matching programme is open right now. Check back soon.</p>}
        </div>
        <button type="button" onClick={() => { setScore(null); setGaps(null); setRecommendations([]); setStep(0); setAnswers({}); }} className="rounded-xl border border-forest/20 px-4 py-2 text-sm font-semibold text-forest">Take the check again</button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-forest/10 bg-white p-5" aria-labelledby="diagnostic-title">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="diagnostic-title" className="font-display text-2xl text-forest">Business readiness check</h2>
        <span className="text-sm text-inkSoft" aria-live="polite">Question {step + 1} of {diagnosticQuestions.length}</span>
      </div>
      <div className="mb-5 h-2 rounded-full bg-cream2" role="progressbar" aria-valuemin={1} aria-valuemax={diagnosticQuestions.length} aria-valuenow={step + 1} aria-label="Diagnostic progress">
        <div className="h-2 rounded-full bg-forest" style={{ width: `${((step + 1) / diagnosticQuestions.length) * 100}%` }} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-leaf">{question.topic}</p>
      <fieldset className="mt-2">
        <legend className="text-lg font-medium text-ink">{question.question}</legend>
        <div className="mt-4 grid gap-2">
          {diagnosticAnswerOptions.map((option) => (
            <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${answers[question.key] === option.value ? "border-forest bg-cream" : "border-forest/15"}`}>
              <input type="radio" name={question.key} value={option.value} checked={answers[question.key] === option.value} onChange={() => setAnswers((current) => ({ ...current, [question.key]: option.value }))} className="accent-forest" />
              <span className="text-sm text-ink">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 flex justify-between gap-3">
        <button type="button" disabled={step === 0 || isSaving} onClick={() => setStep((current) => current - 1)} className="rounded-xl border border-forest/20 px-4 py-3 text-sm font-semibold text-forest disabled:opacity-50">Back</button>
        {step < diagnosticQuestions.length - 1 ? (
          <button type="button" disabled={answers[question.key] === undefined} onClick={() => setStep((current) => current + 1)} className="rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Next</button>
        ) : (
          <button type="button" disabled={answers[question.key] === undefined || isSaving} onClick={() => void finish()} className="rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Saving..." : "See my growth plan"}</button>
        )}
      </div>
    </section>
  );
}
