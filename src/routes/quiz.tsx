import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RotateCcw, Timer, Trophy, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const QUESTION_SECONDS = 30;
const ADVANCE_DELAY_MS = 2000;

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Bible Quiz — Test Your Scripture Knowledge" },
      {
        name: "description",
        content:
          "Take the Grace Book Bible quiz: timed questions from the Old and New Testament with instant answers and your final score.",
      },
      { property: "og:title", content: "Bible Quiz — Grace Book" },
      {
        property: "og:description",
        content: "Timed Bible quiz with instant feedback and a final score.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizPage,
});

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  category: string;
  reference: string | null;
};

function QuizPage() {
  const { user } = useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, question, options, correct_index, category, reference")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [runKey, setRunKey] = useState(0);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(false);

  const questions = data ?? [];
  const current = questions[index];
  const total = questions.length;

  const goNext = useCallback(() => {
    setSelected(null);
    setSecondsLeft(QUESTION_SECONDS);
    setIndex((i) => {
      if (i + 1 >= total) {
        setFinished(true);
        return i;
      }
      return i + 1;
    });
  }, [total]);

  const lockAnswer = useCallback(
    (choice: number | null) => {
      if (selected !== null || !current) return;
      setSelected(choice ?? -1);
      if (choice === current.correct_index) setScore((s) => s + 1);
      advanceRef.current = setTimeout(goNext, ADVANCE_DELAY_MS);
    },
    [current, goNext, selected],
  );

  // Countdown timer per question.
  useEffect(() => {
    if (finished || selected !== null || !current) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          lockAnswer(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [current, finished, selected, lockAnswer]);

  useEffect(
    () => () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    },
    [],
  );

  // Confetti + score save on completion.
  useEffect(() => {
    if (!finished || total === 0) return;
    let cancelled = false;
    void (async () => {
      const confetti = (await import("canvas-confetti")).default;
      if (cancelled) return;
      const colors = ["#9333EA", "#EAB308", "#F5D061"];
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors });
      setTimeout(
        () => confetti({ particleCount: 90, spread: 110, origin: { y: 0.5 }, colors }),
        350,
      );
    })();
    if (user && !savedRef.current) {
      savedRef.current = true;
      void supabase.from("quiz_attempts").insert({ user_id: user.id, score, total });
    }
    return () => {
      cancelled = true;
    };
  }, [finished, score, total, user]);

  function restart() {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    savedRef.current = false;
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setSecondsLeft(QUESTION_SECONDS);
    setRunKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">
          Bible <span className="text-gradient-grace">Quiz</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Thirty seconds a question. Answer, see the truth, keep moving.
        </p>
      </header>

      {isLoading ? (
        <div className="glass mt-10 flex items-center justify-center gap-3 rounded-3xl p-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden /> Loading questions…
        </div>
      ) : error ? (
        <p className="glass mt-10 rounded-3xl p-8 text-sm text-destructive">
          Couldn't load the quiz right now. Please try again.
        </p>
      ) : total === 0 ? (
        <p className="glass mt-10 rounded-3xl p-8 text-sm text-muted-foreground">
          No questions available yet.
        </p>
      ) : finished ? (
        <ScoreCard score={score} total={total} onRestart={restart} signedIn={Boolean(user)} />
      ) : current ? (
        <section key={`${runKey}-${current.id}`} className="glass mt-10 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold tracking-wider text-gold uppercase">
              {current.category} · {index + 1} / {total}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                secondsLeft <= 5
                  ? "border-destructive/50 text-destructive"
                  : "border-glass-border text-foreground",
              )}
              aria-live="off"
            >
              <Timer className="size-4" aria-hidden /> {secondsLeft}s
            </span>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-glass">
            <div
              className="bg-gradient-grace h-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${(secondsLeft / QUESTION_SECONDS) * 100}%` }}
            />
          </div>

          <h2 className="mt-6 text-2xl leading-snug sm:text-3xl">{current.question}</h2>

          <div className="mt-6 grid gap-3">
            {current.options.map((option, i) => {
              const isCorrect = i === current.correct_index;
              const isChosen = selected === i;
              const revealed = selected !== null;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={revealed}
                  onClick={() => lockAnswer(i)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-all sm:text-base",
                    !revealed && "border-glass-border bg-glass hover:border-gold/50",
                    revealed && isCorrect && "border-free/60 bg-free/15 text-free",
                    revealed &&
                      isChosen &&
                      !isCorrect &&
                      "border-destructive/60 bg-destructive/15 text-destructive",
                    revealed && !isCorrect && !isChosen && "border-glass-border opacity-50",
                  )}
                >
                  <span>{option}</span>
                  {revealed && isCorrect ? (
                    <Check className="size-5 shrink-0" aria-hidden />
                  ) : revealed && isChosen ? (
                    <X className="size-5 shrink-0" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>

          {selected !== null ? (
            <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
              {selected === current.correct_index
                ? "Correct!"
                : selected === -1
                  ? "Time's up."
                  : "Not quite."}{" "}
              {current.reference ? (
                <span className="text-gold">{current.reference}</span>
              ) : null}{" "}
              · next question in a moment…
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ScoreCard({
  score,
  total,
  onRestart,
  signedIn,
}: {
  score: number;
  total: number;
  onRestart: () => void;
  signedIn: boolean;
}) {
  const pct = Math.round((score / total) * 100);
  return (
    <section className="glass mt-10 rounded-3xl p-8 text-center sm:p-12">
      <span className="bg-gradient-grace glow-grace mx-auto flex size-16 items-center justify-center rounded-2xl text-primary-foreground">
        <Trophy className="size-8" aria-hidden />
      </span>
      <h2 className="mt-6 text-3xl sm:text-4xl">
        You scored <span className="text-gradient-grace">{score}</span> / {total}
      </h2>
      <p className="mt-2 text-gold">{pct}% — well done.</p>
      <p className="mt-3 text-sm text-muted-foreground">
        {signedIn
          ? "Your score has been saved to your profile."
          : "Sign in on your profile to save scores and track progress."}
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="bg-gradient-grace mt-7 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
      >
        <RotateCcw className="size-4" aria-hidden /> Play again
      </button>
    </section>
  );
}
