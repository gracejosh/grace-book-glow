import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Headphones,
  ImageIcon,
  Loader2,
  Plus,
  Send,
  TextIcon,
  Trash2,
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

export const Route = createFileRoute("/posts")({
  head: () => ({
    meta: [
      { title: "Posts — Grace Book" },
      {
        name: "description",
        content:
          "Share text, images, PDFs and audio with the Grace Book community.",
      },
      { property: "og:title", content: "Posts — Grace Book" },
      {
        property: "og:description",
        content: "Community posts — text, images, PDFs, and audio.",
      },
    ],
  }),
  component: PostsPage,
});

type Post = {
  id: string;
  user_id: string;
  post_type: string;
  title: string | null;
  content: string | null;
  media_url: string | null;
  created_at: string;
};

type PostWithAuthor = Post & {
  author_name: string | null;
  author_avatar: string | null;
};

type PostType = "text" | "image" | "pdf" | "audio";

const TYPE_CONFIG: Record<
  PostType,
  { icon: typeof TextIcon; label: string }
> = {
  text: { icon: TextIcon, label: "Text" },
  image: { icon: ImageIcon, label: "Image" },
  pdf: { icon: FileText, label: "PDF" },
  audio: { icon: Headphones, label: "Audio" },
};

function PostsPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, post_type, title, content, media_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const userIds = [...new Set((posts ?? []).map((p) => p.user_id))];
  const { data: profiles } = useQuery({
    queryKey: ["post_profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      if (error) throw error;
      return (data ?? []) as { id: string; username: string | null; avatar_url: string | null }[];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map<string, { username: string | null; avatar_url: string | null }>();
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url });
    }
  }

  const enriched: PostWithAuthor[] = (posts ?? []).map((p) => {
    const prof = profileMap.get(p.user_id);
    return {
      ...p,
      author_name: prof?.username ?? null,
      author_avatar: prof?.avatar_url ?? null,
    };
  });

  async function deletePost(postId: string) {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast.error("Could not delete post.");
    } else {
      toast.success("Post deleted.");
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">
            Community <span className="text-gradient-grace">Posts</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Share text, images, PDFs, and audio with the community.
          </p>
        </div>
        {user && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-grace glow-grace rounded-full text-primary-foreground"
          >
            <Plus className="size-4" /> New Post
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="glass mt-10 rounded-3xl p-8 text-sm text-destructive">
          Could not load posts right now.
        </p>
      ) : enriched.length === 0 ? (
        <div className="glass mt-10 rounded-3xl p-12 text-center">
          <p className="text-muted-foreground">
            No posts yet. {user ? "Share the first one!" : "Sign in to post."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {enriched.map((post) => {
            const Icon = TYPE_CONFIG[post.post_type as PostType]?.icon ?? TextIcon;
            return (
              <article
                key={post.id}
                className="glass rounded-3xl p-6 transition-all hover:border-gold/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-gradient-grace flex size-10 items-center justify-center rounded-xl text-primary-foreground">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {post.author_name ?? "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {user?.id === post.user_id && (
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Delete post"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {post.title && (
                  <h2 className="mt-4 text-xl font-display">{post.title}</h2>
                )}
                {post.content && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

                {post.media_url && post.post_type === "image" && (
                  <div className="mt-4 overflow-hidden rounded-2xl">
                    <img
                      src={post.media_url}
                      alt={post.title ?? "Post image"}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {post.media_url && post.post_type === "pdf" && (
                  <a
                    href={post.media_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="glass mt-4 flex items-center gap-3 rounded-2xl p-4 transition-colors hover:border-gold/40"
                  >
                    <FileText className="size-6 text-gold" />
                    <span className="text-sm font-medium">View PDF</span>
                  </a>
                )}

                {post.media_url && post.post_type === "audio" && (
                  <audio
                    controls
                    src={post.media_url}
                    className="mt-4 w-full"
                    preload="none"
                  />
                )}
              </article>
            );
          })}
        </div>
      )}

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreatePostDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [postType, setPostType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPostType("text");
    setTitle("");
    setContent("");
    setMediaUrl(null);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!cloudinaryConfigured) {
      toast.error("Media uploads aren't configured yet.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setMediaUrl(url);
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) {
      toast.error("Sign in to post.");
      return;
    }
    if (postType === "text" && !content.trim()) {
      toast.error("Write something first.");
      return;
    }
    if ((postType === "image" || postType === "pdf" || postType === "audio") && !mediaUrl) {
      toast.error("Upload a file first.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      post_type: postType,
      title: title.trim() || null,
      content: content.trim() || null,
      media_url: mediaUrl,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not create post.");
    } else {
      toast.success("Post published.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
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
          <DialogTitle className="font-display text-2xl">New Post</DialogTitle>
          <DialogDescription>Share something with the community.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(Object.keys(TYPE_CONFIG) as PostType[]).map((type) => {
              const Icon = TYPE_CONFIG[type].icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPostType(type)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-xs font-semibold transition-all",
                    postType === type
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-glass-border bg-glass text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {TYPE_CONFIG[type].label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Title (optional)
            </label>
            <Input
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a title"
              className="border-glass-border bg-glass"
            />
          </div>

          {postType === "text" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Content
              </label>
              <Textarea
                value={content}
                maxLength={5000}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your heart?"
                className="border-glass-border bg-glass min-h-32"
              />
            </div>
          )}

          {postType !== "text" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {TYPE_CONFIG[postType].label} file
              </label>
              {mediaUrl ? (
                <div className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
                  <span className="truncate text-sm text-gold">{mediaUrl}</span>
                  <button
                    type="button"
                    onClick={() => setMediaUrl(null)}
                    className="text-muted-foreground hover:text-destructive"
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
                    {uploading ? "Uploading…" : `Click to upload a ${TYPE_CONFIG[postType].label.toLowerCase()} file`}
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={
                      postType === "image"
                        ? "image/*"
                        : postType === "pdf"
                          ? "application/pdf"
                          : postType === "audio"
                            ? "audio/*"
                            : "*/*"
                    }
                    onChange={handleUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {postType !== "text" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Caption (optional)
              </label>
              <Textarea
                value={content}
                maxLength={2000}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a caption…"
                className="border-glass-border bg-glass min-h-16"
              />
            </div>
          )}

          <Button
            onClick={save}
            disabled={saving || uploading}
            className="bg-gradient-grace glow-grace w-full rounded-full text-primary-foreground"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-4" /> Publish
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
