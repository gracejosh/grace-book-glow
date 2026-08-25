import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Plus,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { uploadToCloudinary, cloudinaryConfigured } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flyers")({
  head: () => ({
    meta: [
      { title: "Flyers — Grace Book" },
      {
        name: "description",
        content:
          "Browse and share community flyers. Like your favorites and upload your own.",
      },
      { property: "og:title", content: "Flyers — Grace Book" },
      {
        property: "og:description",
        content: "Community flyers — share, like, and explore.",
      },
    ],
  }),
  component: FlyersPage,
});

type Flyer = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
};

type FlyerWithLikes = Flyer & {
  like_count: number;
  liked_by_me: boolean;
};

function FlyersPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);

  const { data: flyers, isLoading, error } = useQuery({
    queryKey: ["flyers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flyers")
        .select("id, user_id, title, description, image_url, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Flyer[];
    },
  });

  const { data: likesData } = useQuery({
    queryKey: ["flyer_likes_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flyer_likes")
        .select("flyer_id, user_id");
      if (error) throw error;
      return (data ?? []) as { flyer_id: string; user_id: string }[];
    },
  });

  const likeMap = new Map<string, number>();
  if (likesData) {
    for (const l of likesData) {
      likeMap.set(l.flyer_id, (likeMap.get(l.flyer_id) ?? 0) + 1);
    }
  }
  const myLikes = new Set<string>();
  if (likesData && user) {
    for (const l of likesData) {
      if (l.user_id === user.id) myLikes.add(l.flyer_id);
    }
  }

  const enriched: FlyerWithLikes[] = (flyers ?? []).map((f) => ({
    ...f,
    like_count: likeMap.get(f.id) ?? 0,
    liked_by_me: myLikes.has(f.id),
  }));

  async function toggleLike(flyerId: string, liked: boolean) {
    if (!user) {
      toast.error("Sign in to like flyers.");
      return;
    }
    if (liked) {
      const { error } = await supabase
        .from("flyer_likes")
        .delete()
        .eq("flyer_id", flyerId)
        .eq("user_id", user.id);
      if (error) toast.error("Could not unlike.");
    } else {
      const { error } = await supabase
        .from("flyer_likes")
        .insert({ flyer_id: flyerId, user_id: user.id });
      if (error) toast.error("Could not like.");
    }
    void queryClient.invalidateQueries({ queryKey: ["flyer_likes_all"] });
  }

  async function shareFlyer(flyer: Flyer) {
    const url = `${window.location.origin}/flyers`;
    if (navigator.share) {
      try {
        await navigator.share({ title: flyer.title, text: flyer.description ?? "", url });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard.");
      } catch {
        toast.error("Could not copy link.");
      }
    }
  }

  function navigateCarousel(dir: -1 | 1) {
    if (carouselIndex === null || !enriched.length) return;
    setCarouselIndex((i) => {
      if (i === null) return i;
      const next = (i + dir + enriched.length) % enriched.length;
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">
            Community <span className="text-gradient-grace">Flyers</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Share and discover event flyers. Tap to enlarge, like, and share.
          </p>
        </div>
        {user && (
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-gradient-grace glow-grace rounded-full text-primary-foreground"
          >
            <Plus className="size-4" /> Upload Flyer
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="glass mt-10 rounded-3xl p-8 text-sm text-destructive">
          Could not load flyers right now.
        </p>
      ) : enriched.length === 0 ? (
        <div className="glass mt-10 rounded-3xl p-12 text-center">
          <p className="text-muted-foreground">
            No flyers yet. {user ? "Upload the first one!" : "Check back soon."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {enriched.map((flyer, i) => (
              <article
                key={flyer.id}
                className="glass group overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:border-gold/40"
              >
                <button
                  type="button"
                  onClick={() => setCarouselIndex(i)}
                  className="block w-full"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={flyer.image_url}
                      alt={flyer.title}
                      loading="lazy"
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                </button>
                <div className="p-4">
                  <h2 className="truncate text-sm font-semibold sm:text-base">
                    {flyer.title}
                  </h2>
                  {flyer.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {flyer.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleLike(flyer.id, flyer.liked_by_me)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                        flyer.liked_by_me
                          ? "bg-destructive/15 text-destructive"
                          : "border border-glass-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Heart
                        className={cn("size-3.5", flyer.liked_by_me && "fill-current")}
                      />
                      {flyer.like_count}
                    </button>
                    <button
                      type="button"
                      onClick={() => shareFlyer(flyer)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-gold"
                    >
                      <Share2 className="size-3.5" /> Share
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Carousel lightbox */}
      {carouselIndex !== null && enriched[carouselIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setCarouselIndex(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCarouselIndex(null);
            }}
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-foreground transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigateCarousel(-1);
            }}
            className="absolute left-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-foreground transition-colors hover:bg-white/20 sm:left-6"
            aria-label="Previous"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigateCarousel(1);
            }}
            className="absolute right-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-foreground transition-colors hover:bg-white/20 sm:right-6"
            aria-label="Next"
          >
            <ChevronRight className="size-6" />
          </button>
          <div
            className="mx-auto max-h-[85vh] max-w-2xl px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enriched[carouselIndex]!.image_url}
              alt={enriched[carouselIndex]!.title}
              className="max-h-[70vh] mx-auto rounded-2xl object-contain"
            />
            <div className="mt-4 text-center">
              <h2 className="text-xl font-display">
                {enriched[carouselIndex]!.title}
              </h2>
              {enriched[carouselIndex]!.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {enriched[carouselIndex]!.description}
                </p>
              )}
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleLike(
                      enriched[carouselIndex]!.id,
                      enriched[carouselIndex]!.liked_by_me,
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
                    enriched[carouselIndex]!.liked_by_me
                      ? "bg-destructive/20 text-destructive"
                      : "glass text-foreground",
                  )}
                >
                  <Heart
                    className={cn(
                      "size-4",
                      enriched[carouselIndex]!.liked_by_me && "fill-current",
                    )}
                  />
                  {enriched[carouselIndex]!.like_count}
                </button>
                <button
                  type="button"
                  onClick={() => shareFlyer(enriched[carouselIndex]!)}
                  className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:text-gold"
                >
                  <Share2 className="size-4" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setImageUrl(null);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!cloudinaryConfigured) {
      toast.error("Image uploads aren't configured yet.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) {
      toast.error("Sign in to upload flyers.");
      return;
    }
    if (!title.trim() || !imageUrl) {
      toast.error("Add a title and image.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("flyers").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save flyer.");
    } else {
      toast.success("Flyer uploaded.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["flyers"] });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="glass-strong max-w-lg border-glass-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Upload Flyer</DialogTitle>
          <DialogDescription>
            Share an event flyer with the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {imageUrl ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={imageUrl} alt="Preview" className="max-h-64 w-full object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="glass flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-glass-border p-8 transition-colors hover:border-gold/40">
              {uploading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading…" : "Click to upload an image"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Title
            </label>
            <Input
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="border-glass-border bg-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Description
            </label>
            <Textarea
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Date, time, location, details…"
              className="border-glass-border bg-glass min-h-20"
            />
          </div>

          <Button
            onClick={save}
            disabled={saving || !title.trim() || !imageUrl}
            className="bg-gradient-grace glow-grace w-full rounded-full text-primary-foreground"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Publish Flyer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
