import { createFileRoute } from "@tanstack/react-router";
import { Apple, BookMarked, Download } from "lucide-react";

import { BOOKS } from "@/lib/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/books")({
  head: () => ({
    meta: [
      { title: "Books — Grace Book Library" },
      {
        name: "description",
        content:
          "Download free Christian classics as PDF or EPUB, or buy featured devotionals on Apple Books.",
      },
      { property: "og:title", content: "Books — Grace Book Library" },
      {
        property: "og:description",
        content: "Free PDF and EPUB classics plus paid devotionals on Apple Books.",
      },
    ],
  }),
  component: BooksPage,
});

function BooksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">
          The <span className="text-gradient-grace">Library</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Timeless works of grace — free to download, or available on Apple Books.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BOOKS.map((book) => {
          const free = book.price === null;
          return (
            <article
              key={book.id}
              className="glass flex flex-col rounded-3xl p-6 transition-all hover:-translate-y-1 hover:border-gold/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="bg-gradient-grace flex size-11 items-center justify-center rounded-2xl text-primary-foreground">
                  <BookMarked className="size-5" aria-hidden />
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase",
                    free
                      ? "bg-free text-free-foreground"
                      : "border border-gold/50 text-gold",
                  )}
                >
                  {free ? "Free" : `$${book.price!.toFixed(2)}`}
                </span>
              </div>

              <h2 className="mt-5 text-2xl leading-snug">{book.title}</h2>
              <p className="mt-1 text-sm text-gold">{book.author}</p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{book.blurb}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {free ? (
                  <>
                    {book.pdfUrl ? (
                      <a
                        href={book.pdfUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="bg-gradient-grace inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
                      >
                        <Download className="size-4" aria-hidden /> PDF
                      </a>
                    ) : null}
                    {book.epubUrl ? (
                      <a
                        href={book.epubUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
                      >
                        <Download className="size-4" aria-hidden /> EPUB
                      </a>
                    ) : null}
                  </>
                ) : (
                  <a
                    href={book.appleBooksUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="glow-gold inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground transition-transform hover:scale-[1.03]"
                  >
                    <Apple className="size-4" aria-hidden /> Buy on Apple Books
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
