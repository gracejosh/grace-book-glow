import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, MessagesSquare, Sparkles } from "lucide-react";

import heroGlow from "@/assets/hero-glow.jpg";
import { RadioPlayer } from "@/components/RadioPlayer";
import { verseOfTheDay } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grace Book — Daily Verse & Live Gospel Radio" },
      {
        name: "description",
        content:
          "Start each day with a verse of grace and listen to K-LOVE, Air1 or BBN live in Grace Book.",
      },
      { property: "og:title", content: "Grace Book — Daily Verse & Live Gospel Radio" },
      {
        property: "og:description",
        content: "A daily verse and live Gospel radio, wrapped in quiet purple and gold.",
      },
    ],
  }),
  component: Home,
});

const LINKS = [
  { to: "/books", label: "Books", copy: "Free classics & paid titles", icon: BookOpen },
  { to: "/courses", label: "Courses", copy: "Watch guided teaching", icon: GraduationCap },
  { to: "/chat", label: "Chat", copy: "Pray with the community", icon: MessagesSquare },
] as const;

function Home() {
  const verse = verseOfTheDay();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="relative overflow-hidden rounded-4xl border border-glass-border">
        <img
          src={heroGlow}
          alt="Golden light streaming through purple stained glass"
          width={1536}
          height={896}
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="relative px-6 py-14 text-center sm:px-12 sm:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-gold uppercase">
            <Sparkles className="size-3.5" aria-hidden /> {today}
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-tight sm:text-6xl">
            Verse of the <span className="text-gradient-grace">Day</span>
          </h1>
          <blockquote className="mx-auto mt-7 max-w-2xl font-display text-2xl leading-relaxed italic sm:text-3xl">
            “{verse.text}”
          </blockquote>
          <p className="mt-5 text-sm font-semibold tracking-widest text-gold uppercase">
            {verse.reference}
          </p>
        </div>
      </section>

      <div className="mt-10">
        <RadioPlayer />
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Explore Grace Book">
        {LINKS.map(({ to, label, copy, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="glass group rounded-3xl p-6 transition-all hover:-translate-y-1 hover:border-gold/50"
          >
            <Icon className="size-6 text-gold" aria-hidden />
            <h2 className="mt-4 text-2xl">{label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
