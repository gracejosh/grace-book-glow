import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  Camera,
  Check,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  RotateCcw,
  Trophy,
  User,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { uploadToCloudinary, cloudinaryConfigured } from "@/lib/cloudinary";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Grace Book" },
      {
        name: "description",
        content:
          "Your Grace Book profile: avatar, bio, quiz scores and download history.",
      },
      { property: "og:title", content: "Profile — Grace Book" },
      {
        property: "og:description",
        content: "Manage your profile, track quiz scores and book downloads.",
      },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
};

type QuizAttempt = {
  id: string;
  score: number;
  total: number;
  created_at: string;
};

type BookDownload = {
  id: string;
  book_id: string;
  book_title: string;
  format: string | null;
  created_at: string;
};

function ProfilePage() {
  const { session, user, loading } = useSession();

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || !user) {
    return <AuthCard />;
  }

  return <ProfileContent userId={user.id} email={user.email ?? ""} />;
}

function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username || undefined } },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created — you're signed in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back.");
      }
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="text-center">
        <span className="bg-gradient-grace glow-grace mx-auto flex size-14 items-center justify-center rounded-2xl text-primary-foreground">
          <UserCircle className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl sm:text-4xl">
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to manage your profile and track progress."
            : "Join Grace Book to save your scores and share with the community."}
        </p>
      </div>

      <form onSubmit={submit} className="glass-strong mt-8 rounded-3xl p-6 sm:p-8">
        {mode === "signup" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Display name
            </label>
            <Input
              value={username}
              maxLength={40}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Miriam"
              className="border-glass-border bg-glass"
            />
          </div>
        )}

        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="border-glass-border bg-glass pl-10"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Password
          </label>
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="border-glass-border bg-glass"
          />
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="bg-gradient-grace glow-grace mt-6 w-full rounded-full text-primary-foreground"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : mode === "signin" ? (
            <>
              <LogIn className="size-4" /> Sign In
            </>
          ) : (
            <>
              <User className="size-4" /> Create Account
            </>
          )}
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to Grace Book?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-gold transition-colors hover:underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </form>
    </div>
  );
}

function ProfileContent({ userId, email }: { userId: string; email: string }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, role, created_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["quiz_attempts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, score, total, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as QuizAttempt[];
    },
  });

  const { data: downloads } = useQuery({
    queryKey: ["book_downloads", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_downloads")
        .select("id, book_id, book_title, format, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as BookDownload[];
    },
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!cloudinaryConfigured) {
      toast.error("Image uploads aren't configured yet.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);
      toast.success("Photo uploaded — save to confirm.");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Could not save profile.");
    } else {
      toast.success("Profile saved.");
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out.");
  }

  const isAdmin = profile?.role === "admin";
  const bestScore = attempts && attempts.length > 0
    ? Math.max(...attempts.map((a) => Math.round((a.score / a.total) * 100)))
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">
            Your <span className="text-gradient-grace">Profile</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gold transition-colors hover:border-gold/50"
            >
              <Award className="size-4" /> Admin
            </Link>
          )}
          <Button
            onClick={signOut}
            variant="outline"
            className="glass rounded-full border-glass-border"
          >
            <LogOut className="size-4" /> Sign Out
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={saveProfile} className="glass-strong mt-8 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <Avatar className="size-24 border-2 border-gold/30">
                {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
                <AvatarFallback className="bg-gradient-grace text-2xl text-primary-foreground">
                  {(username || email)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="bg-gradient-grace absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-110 disabled:opacity-50"
                aria-label="Change avatar"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Display name
                </label>
                <Input
                  value={username}
                  maxLength={40}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name"
                  className="border-glass-border bg-glass"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Bio
                </label>
                <Textarea
                  value={bio}
                  maxLength={300}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short line about you…"
                  className="border-glass-border bg-glass min-h-20"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-grace glow-grace rounded-full text-primary-foreground"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Check className="size-4" /> Save
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2 text-gold">
            <Trophy className="size-5" />
            <h2 className="text-xl">Quiz History</h2>
          </div>
          {attempts && attempts.length > 0 ? (
            <div className="mt-4 space-y-3">
              {bestScore !== null && (
                <div className="bg-gradient-grace mb-2 flex items-center justify-between rounded-2xl px-4 py-3 text-primary-foreground">
                  <span className="text-sm font-semibold">Best score</span>
                  <span className="font-display text-2xl">{bestScore}%</span>
                </div>
              )}
              {attempts.map((a) => {
                const pct = Math.round((a.score / a.total) * 100);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-2xl border border-glass-border bg-glass px-4 py-3"
                  >
                    <span className="text-sm">
                      {a.score} / {a.total}
                    </span>
                    <span className="font-display text-lg text-gold">{pct}%</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No quizzes taken yet.{" "}
              <Link to="/quiz" className="text-gold hover:underline">
                Take one now
              </Link>
              .
            </p>
          )}
        </section>

        <section className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2 text-gold">
            <BookOpen className="size-5" />
            <h2 className="text-xl">Recent Downloads</h2>
          </div>
          {downloads && downloads.length > 0 ? (
            <div className="mt-4 space-y-3">
              {downloads.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-2xl border border-glass-border bg-glass px-4 py-3"
                >
                  <span className="text-sm">{d.book_title}</span>
                  {d.format && (
                    <span className="rounded-full border border-gold/30 px-2 py-0.5 text-xs text-gold">
                      {d.format.toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No downloads yet.{" "}
              <Link to="/books" className="text-gold hover:underline">
                Browse the library
              </Link>
              .
            </p>
          )}
        </section>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/quiz"
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-gold/40"
        >
          <RotateCcw className="size-4" /> Retake Quiz
        </Link>
        <Link
          to="/flyers"
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-gold/40"
        >
          Browse Flyers
        </Link>
      </div>
    </div>
  );
}
