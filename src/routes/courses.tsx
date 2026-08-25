import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, ListVideo, Play } from "lucide-react";

import { COURSES, type Course } from "@/lib/content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Grace Book Teaching" },
      {
        name: "description",
        content:
          "Short video courses on grace, prayer, the Gospels, Psalms and Romans — watch free inside Grace Book.",
      },
      { property: "og:title", content: "Courses — Grace Book Teaching" },
      {
        property: "og:description",
        content: "Watch guided video teaching on grace, prayer and Scripture.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [active, setActive] = useState<Course | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">
          Guided <span className="text-gradient-grace">Courses</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sit down for a few minutes at a time. Tap any course to watch.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((course) => (
          <button
            key={course.id}
            type="button"
            onClick={() => setActive(course)}
            className="glass group overflow-hidden rounded-3xl text-left transition-all hover:-translate-y-1 hover:border-gold/40"
          >
            <div className="relative aspect-video overflow-hidden">
              <img
                src={`https://i.ytimg.com/vi/${course.youtubeId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                width={480}
                height={360}
                className="size-full object-cover opacity-70 transition-opacity group-hover:opacity-100"
              />
              <span className="bg-gradient-grace glow-grace absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full text-primary-foreground transition-transform group-hover:scale-110">
                <Play className="size-6 translate-x-0.5" aria-hidden />
              </span>
            </div>
            <div className="p-6">
              <h2 className="text-2xl leading-snug">{course.title}</h2>
              <p className="mt-1 text-sm text-gold">{course.teacher}</p>
              <p className="mt-3 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ListVideo className="size-3.5" aria-hidden /> {course.lessons} lessons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden /> {course.minutes} min
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="glass-strong max-w-3xl border-glass-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{active?.title}</DialogTitle>
            <DialogDescription>{active?.description}</DialogDescription>
          </DialogHeader>
          {active ? (
            <div className="aspect-video overflow-hidden rounded-2xl">
              <iframe
                key={active.id}
                src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?autoplay=1&rel=0`}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
