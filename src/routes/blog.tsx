import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Trash2,
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

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Grace Book" },
      {
        name: "description",
        content:
          "Read and share blog posts on grace, Scripture, and the Christian life. Like, comment, and share.",
      },
      { property: "og:title", content: "Blog — Grace Book" },
      {
        property: "og:description",
        content: "Blog posts on grace, Scripture, and the Christian life.",
      },
    ],
  }),
  component: BlogPage,
});

type BlogPost = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  created_at: string;
};

type BlogPostWithMeta = BlogPost & {
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  author_name: string | null;
};

type Comment = {
  id: string;
  blog_post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
};

function BlogPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["blog_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, user_id, title, body, excerpt, cover_image_url, tags, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });

  const { data: likes } = useQuery({
    queryKey: ["blog_likes_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_likes")
        .select("blog_post_id, user_id");
      if (error) throw error;
      return (data ?? []) as { blog_post_id: string; user_id: string }[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["blog_comments_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_comments")
        .select("id, blog_post_id, user_id, content, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Omit<Comment, "author_name">[];
    },
  });

  const userIds = [...new Set((posts ?? []).map((p) => p.user_id))];
  const { data: profiles } = useQuery({
    queryKey: ["blog_profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      if (error) throw error;
      return (data ?? []) as { id: string; username: string | null }[];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map<string, string | null>();
  if (profiles) {
    for (const p of profiles) profileMap.set(p.id, p.username);
  }

  const likeMap = new Map<string, number>();
  if (likes) {
    for (const l of likes) {
      likeMap.set(l.blog_post_id, (likeMap.get(l.blog_post_id) ?? 0) + 1);
    }
  }
  const myLikes = new Set<string>();
  if (likes && user) {
    for (const l of likes) {
      if (l.user_id === user.id) myLikes.add(l.blog_post_id);
    }
  }

  const commentMap = new Map<string, number>();
  if (comments) {
    for (const c of comments) {
      commentMap.set(c.blog_post_id, (commentMap.get(c.blog_post_id) ?? 0) + 1);
    }
  }

  const enriched: BlogPostWithMeta[] = (posts ?? []).map((p) => ({
    ...p,
    like_count: likeMap.get(p.id) ?? 0,
    liked_by_me: myLikes.has(p.id),
    comment_count: commentMap.get(p.id) ?? 0,
    author_name: profileMap.get(p.user_id) ?? null,
  }));

  async function toggleLike(postId: string, liked: boolean) {
    if (!user) {
      toast.error("Sign in to like posts.");
      return;
    }
    if (liked) {
      await supabase
        .from("blog_likes")
        .delete()
        .eq("blog_post_id", postId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("blog_likes")
        .insert({ blog_post_id: postId, user_id: user.id });
    }
    void queryClient.invalidateQueries({ queryKey: ["blog_likes_all"] });
  }

  async function sharePost(post: BlogPost) {
    const url = `${window.location.origin}/blog`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
      } catch {
        // cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied.");
      } catch {
        toast.error("Could not copy link.");
      }
    }
  }

  async function deletePost(postId: string) {
    const { error } = await supabase.from("blog_posts").delete().eq("id", postId);
    if (error) {
      toast.error("Could not delete post.");
    } else {
      toast.success("Post deleted.");
      void queryClient.invalidateQueries({ queryKey: ["blog_posts"] });
    }
  }

  const activePost = activePostId ? enriched.find((p) => p.id === activePostId) : null;

  if (activePost) {
    return (
      <BlogPostDetail
        post={activePost}
        comments={comments ?? []}
        profileMap={profileMap}
        user={user}
        onBack={() => setActivePostId(null)}
        onToggleLike={toggleLike}
        onShare={sharePost}
        onDelete={deletePost}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">
            The <span className="text-gradient-grace">Blog</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Reflections on grace, Scripture, and the Christian life.
          </p>
        </div>
        {user && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-grace glow-grace rounded-full text-primary-foreground"
          >
            <Plus className="size-4" /> Write Post
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="glass mt-10 rounded-3xl p-8 text-sm text-destructive">
          Could not load blog posts right now.
        </p>
      ) : enriched.length === 0 ? (
        <div className="glass mt-10 rounded-3xl p-12 text-center">
          <p className="text-muted-foreground">
            No blog posts yet. {user ? "Write the first one!" : "Check back soon."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((post) => (
            <article
              key={post.id}
              className="glass group flex flex-col overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:border-gold/40"
            >
              {post.cover_image_url ? (
                <button
                  type="button"
                  onClick={() => setActivePostId(post.id)}
                  className="aspect-video w-full overflow-hidden"
                >
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActivePostId(post.id)}
                  className="bg-gradient-grace aspect-video w-full"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gold/30 px-2.5 py-0.5 text-xs text-gold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActivePostId(post.id)}
                  className="mt-3 text-left"
                >
                  <h2 className="text-xl leading-snug group-hover:text-gold transition-colors">
                    {post.title}
                  </h2>
                </button>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {post.excerpt ?? post.body.slice(0, 150)}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-glass-border pt-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" />
                      {post.comment_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id, post.liked_by_me)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                        post.liked_by_me
                          ? "bg-destructive/15 text-destructive"
                          : "border border-glass-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Heart
                        className={cn("size-3.5", post.liked_by_me && "fill-current")}
                      />
                      {post.like_count}
                    </button>
                    <button
                      type="button"
                      onClick={() => sharePost(post)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-gold"
                    >
                      <Share2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateBlogDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function BlogPostDetail({
  post,
  comments,
  profileMap,
  user,
  onBack,
  onToggleLike,
  onShare,
  onDelete,
}: {
  post: BlogPostWithMeta;
  comments: Omit<Comment, "author_name">[];
  profileMap: Map<string, string | null>;
  user: ReturnType<typeof useSession>["user"];
  onBack: () => void;
  onToggleLike: (id: string, liked: boolean) => void;
  onShare: (post: BlogPost) => void;
  onDelete: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const postComments: Comment[] = comments
    .filter((c) => c.blog_post_id === post.id)
    .map((c) => ({
      ...c,
      author_name: profileMap.get(c.user_id) ?? null,
    }));

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to comment.");
      return;
    }
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    const { error } = await supabase.from("blog_comments").insert({
      blog_post_id: post.id,
      user_id: user.id,
      content: content.slice(0, 2000),
    });
    setPosting(false);
    if (error) {
      toast.error("Could not post comment.");
    } else {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["blog_comments_all"] });
      toast.success("Comment added.");
    }
  }

  async function deleteComment(commentId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("blog_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Could not delete comment.");
    } else {
      void queryClient.invalidateQueries({ queryKey: ["blog_comments_all"] });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <button
        type="button"
        onClick={onBack}
        className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors hover:border-gold/40"
      >
        <ArrowLeft className="size-4" /> All Posts
      </button>

      <article className="mt-8">
        {post.cover_image_url && (
          <div className="overflow-hidden rounded-3xl">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="aspect-video w-full object-cover"
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gold/30 px-2.5 py-0.5 text-xs text-gold"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {post.author_name ?? "Anonymous"} ·{" "}
          {new Date(post.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <div className="mt-6 text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {post.body}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-glass-border pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleLike(post.id, post.liked_by_me)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
                post.liked_by_me
                  ? "bg-destructive/15 text-destructive"
                  : "glass text-foreground",
              )}
            >
              <Heart className={cn("size-4", post.liked_by_me && "fill-current")} />
              {post.like_count}
            </button>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="size-4" />
              {post.comment_count}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onShare(post)}
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:text-gold"
            >
              <Share2 className="size-4" /> Share
            </button>
            {user?.id === post.user_id && (
              <button
                type="button"
                onClick={() => {
                  onDelete(post.id);
                  onBack();
                }}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-destructive transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      </article>

      <section className="mt-10">
        <h2 className="text-xl font-display">Comments</h2>

        {user ? (
          <form onSubmit={submitComment} className="glass-strong mt-4 flex items-end gap-2 rounded-3xl p-4">
            <Textarea
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a comment…"
              className="border-glass-border bg-glass min-h-16 flex-1"
            />
            <Button
              type="submit"
              disabled={posting || !draft.trim()}
              className="bg-gradient-grace glow-grace rounded-full text-primary-foreground"
            >
              {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        ) : (
          <p className="glass mt-4 rounded-2xl p-4 text-sm text-muted-foreground">
            Sign in to leave a comment.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {postComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            postComments.map((c) => (
              <div key={c.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gold">
                    {c.author_name ?? "Anonymous"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {user?.id === c.user_id && (
                      <button
                        type="button"
                        onClick={() => deleteComment(c.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function CreateBlogDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setBody("");
    setExcerpt("");
    setTags("");
    setCoverUrl(null);
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
      setCoverUrl(url);
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) {
      toast.error("Sign in to write.");
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and body.");
      return;
    }
    setSaving(true);
    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const { error } = await supabase.from("blog_posts").insert({
      user_id: user.id,
      title: title.trim(),
      body: body.trim(),
      excerpt: excerpt.trim() || null,
      cover_image_url: coverUrl,
      tags: tagArray,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save post.");
    } else {
      toast.success("Blog post published.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["blog_posts"] });
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
      <DialogContent className="glass-strong max-w-2xl border-glass-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Write Blog Post</DialogTitle>
          <DialogDescription>Share a reflection with the community.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {coverUrl ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={coverUrl} alt="Cover preview" className="aspect-video w-full object-cover" />
              <button
                type="button"
                onClick={() => setCoverUrl(null)}
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="glass flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-glass-border p-6 transition-colors hover:border-gold/40">
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Plus className="size-5 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading…" : "Add cover image (optional)"}
              </span>
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Title
            </label>
            <Input
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Your post title"
              className="border-glass-border bg-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Body
            </label>
            <Textarea
              value={body}
              maxLength={20000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your post…"
              className="border-glass-border bg-glass min-h-48"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Excerpt (optional)
              </label>
              <Input
                value={excerpt}
                maxLength={300}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short summary"
                className="border-glass-border bg-glass"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Tags (comma-separated)
              </label>
              <Input
                value={tags}
                maxLength={200}
                onChange={(e) => setTags(e.target.value)}
                placeholder="grace, prayer, faith"
                className="border-glass-border bg-glass"
              />
            </div>
          </div>

          <Button
            onClick={save}
            disabled={saving || uploading || !title.trim() || !body.trim()}
            className="bg-gradient-grace glow-grace w-full rounded-full text-primary-foreground"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Publish Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
