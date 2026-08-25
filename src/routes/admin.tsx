import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Ban,
  Check,
  Image as ImageIcon,
  Loader2,
  MessageSquareOff,
  MessageSquare,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Grace Book" },
      {
        name: "description",
        content: "Admin dashboard: manage users, ads, and chat settings.",
      },
    ],
  }),
  component: AdminPage,
});

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
};

type Ad = {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  position: string;
  active: boolean;
  clicks: number;
  created_at: string;
};

type ChatControl = {
  id: number;
  chat_enabled: boolean;
  max_messages_per_minute: number;
};

function AdminPage() {
  const { user, loading } = useSession();
  const [tab, setTab] = useState<"users" | "ads" | "chat">("users");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, role, created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl">Admin Access Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please{" "}
          <Link to="/profile" className="text-gold hover:underline">
            sign in
          </Link>{" "}
          with an admin account.
        </p>
      </div>
    );
  }

  if (profile && profile.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Ban className="mx-auto size-12 text-destructive" />
        <h1 className="mt-4 text-2xl">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have admin privileges.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <h1 className="text-4xl sm:text-5xl">
          <span className="text-gradient-grace">Admin</span> Dashboard
        </h1>
        <p className="mt-3 text-muted-foreground">
          Manage users, advertisements, and chat settings.
        </p>
      </header>

      <nav className="mt-8 flex gap-2">
        {([
          { key: "users", label: "Users", icon: Users },
          { key: "ads", label: "Ads", icon: ImageIcon },
          { key: "chat", label: "Chat Control", icon: MessageSquare },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              tab === key
                ? "bg-gradient-grace text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "users" && <UsersPanel />}
        {tab === "ads" && <AdsPanel />}
        {tab === "chat" && <ChatControlPanel />}
      </div>
    </div>
  );
}

function UsersPanel() {
  const queryClient = useQueryClient();
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  async function toggleAdmin(profile: Profile) {
    const newRole = profile.role === "admin" ? "user" : "admin";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profile.id);
    if (error) {
      toast.error("Could not update role. Role changes require service-role access.");
    } else {
      toast.success(`${profile.username ?? "User"} is now ${newRole}.`);
      void queryClient.invalidateQueries({ queryKey: ["all_profiles"] });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl p-6">
      <div className="flex items-center gap-2 text-gold">
        <Users className="size-5" />
        <h2 className="text-xl">User Management</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {profiles?.length ?? 0} registered users
      </p>

      <div className="mt-6 space-y-3">
        {(profiles ?? []).map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-glass-border bg-glass px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-grace text-sm font-bold text-primary-foreground">
                {(p.username ?? "?")[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{p.username ?? "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase",
                  p.role === "admin"
                    ? "bg-gold/20 text-gold"
                    : "border border-glass-border text-muted-foreground",
                )}
              >
                {p.role}
              </span>
              <Button
                onClick={() => toggleAdmin(p)}
                variant="outline"
                size="sm"
                className="glass rounded-full border-glass-border text-xs"
              >
                {p.role === "admin" ? "Demote" : "Promote"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdsPanel() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: ads, isLoading } = useQuery({
    queryKey: ["ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id, title, image_url, link_url, position, active, clicks, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ad[];
    },
  });

  async function toggleAd(ad: Ad) {
    const { error } = await supabase
      .from("ads")
      .update({ active: !ad.active })
      .eq("id", ad.id);
    if (error) {
      toast.error("Could not update ad.");
    } else {
      void queryClient.invalidateQueries({ queryKey: ["ads"] });
    }
  }

  async function deleteAd(id: string) {
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete ad.");
    } else {
      toast.success("Ad deleted.");
      void queryClient.invalidateQueries({ queryKey: ["ads"] });
    }
  }

  return (
    <div className="glass-strong rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gold">
          <ImageIcon className="size-5" />
          <h2 className="text-xl">Advertisements</h2>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-grace glow-grace rounded-full text-primary-foreground"
        >
          New Ad
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (ads ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No ads created yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {(ads ?? []).map((ad) => (
            <div
              key={ad.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-glass-border bg-glass px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="size-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="bg-gradient-grace flex size-12 items-center justify-center rounded-xl">
                    <ImageIcon className="size-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{ad.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ad.position} · {ad.clicks} clicks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={ad.active} onCheckedChange={() => toggleAd(ad)} />
                <button
                  type="button"
                  onClick={() => deleteAd(ad.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateAdDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateAdDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [position, setPosition] = useState("sidebar");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setImageUrl("");
    setLinkUrl("");
    setPosition("sidebar");
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Add a title.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ads").insert({
      title: title.trim(),
      image_url: imageUrl.trim() || null,
      link_url: linkUrl.trim() || null,
      position,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not create ad.");
    } else {
      toast.success("Ad created.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["ads"] });
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
      <DialogContent className="glass-strong max-w-md border-glass-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">New Advertisement</DialogTitle>
          <DialogDescription>Create a new ad for the platform.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ad title"
              className="border-glass-border bg-glass"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Image URL
            </label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="border-glass-border bg-glass"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Link URL
            </label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              className="border-glass-border bg-glass"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Position
            </label>
            <div className="flex gap-2">
              {["sidebar", "banner", "inline"].map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition-all",
                    position === pos
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-glass-border bg-glass text-muted-foreground",
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-gradient-grace glow-grace w-full rounded-full text-primary-foreground"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Create Ad"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChatControlPanel() {
  const queryClient = useQueryClient();
  const [rateLimit, setRateLimit] = useState(10);
  const [saving, setSaving] = useState(false);

  const { data: control, isLoading } = useQuery({
    queryKey: ["chat_control"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_chat_control")
        .select("id, chat_enabled, max_messages_per_minute, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as ChatControl | null;
    },
  });

  useState(() => {
    if (control) setRateLimit(control.max_messages_per_minute);
  });

  async function toggleChat(enabled: boolean) {
    const { error } = await supabase
      .from("admin_chat_control")
      .update({ chat_enabled: enabled })
      .eq("id", 1);
    if (error) {
      toast.error("Could not update chat setting.");
    } else {
      toast.success(enabled ? "Chat enabled." : "Chat disabled.");
      void queryClient.invalidateQueries({ queryKey: ["chat_control"] });
    }
  }

  async function saveRateLimit() {
    setSaving(true);
    const { error } = await supabase
      .from("admin_chat_control")
      .update({ max_messages_per_minute: rateLimit })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error("Could not update rate limit.");
    } else {
      toast.success("Rate limit saved.");
      void queryClient.invalidateQueries({ queryKey: ["chat_control"] });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chatEnabled = control?.chat_enabled ?? true;
  const currentLimit = control?.max_messages_per_minute ?? 10;

  return (
    <div className="glass-strong rounded-3xl p-6">
      <div className="flex items-center gap-2 text-gold">
        <MessageSquare className="size-5" />
        <h2 className="text-xl">Chat Control</h2>
      </div>

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-glass-border bg-glass px-4 py-4">
          <div className="flex items-center gap-3">
            {chatEnabled ? (
              <MessageSquare className="size-5 text-free" />
            ) : (
              <MessageSquareOff className="size-5 text-destructive" />
            )}
            <div>
              <p className="text-sm font-semibold">
                Chat {chatEnabled ? "Enabled" : "Disabled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {chatEnabled
                  ? "Users can send messages in the global chat."
                  : "Chat is currently turned off for all users."}
              </p>
            </div>
          </div>
          <Switch checked={chatEnabled} onCheckedChange={toggleChat} />
        </div>

        <div className="rounded-2xl border border-glass-border bg-glass px-4 py-4">
          <p className="text-sm font-semibold">Rate Limit</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current: {currentLimit} messages per minute
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={60}
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value) || 1)}
              className="border-glass-border bg-glass w-24"
            />
            <Button
              onClick={saveRateLimit}
              disabled={saving}
              className="bg-gradient-grace glow-grace rounded-full text-primary-foreground"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
