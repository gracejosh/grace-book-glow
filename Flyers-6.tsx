import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase, uploadToCloudinary } from '@/lib/supabase';
import { getBlockedUserIds } from '@/lib/chatBlocks';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/context/LanguageContext';
import type { Flyer, Profile } from '@/types';
import { EmptyState } from '@/components/ui';
import { awardPoints, POINTS } from '@/lib/awardPoints';
import {
  Heart, Share2, Plus, X, ChevronLeft, ChevronRight, Loader,
  Search, Image as ImageIcon, Trash2, Send, Download, Type,
  BookOpen, Church, GraduationCap, Sparkles, ArrowRight,
} from 'lucide-react';

const CATEGORIES = [
  'Evangelism', 'Salvation', 'Prayer', 'Youth', 'Women', 'Men',
  'Outreach', 'Events', 'Testimony', 'Other',
];

type FlyerType = 'image' | 'text';
type TypeFilter = 'all' | FlyerType;

const getAuthorName = (author?: Profile | null) => {
  if (!author) return 'Grace Book member';
  const record = author as Profile & { display_name?: string | null; full_name?: string | null; name?: string | null; email?: string | null };
  return record.username?.trim() || record.display_name?.trim() || record.full_name?.trim() || record.name?.trim() || record.email?.split('@')[0] || 'Grace Book member';
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function Flyers() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLang();
  const [language, setLanguage] = useState<'en' | 'am'>(() => {
    try { return localStorage.getItem('grace-book-language') === 'am' ? 'am' : 'en'; } catch { return 'en'; }
  });
  const tr = (en: string, am: string) => language === 'am' ? am : en;
  useEffect(() => {
    try { localStorage.setItem('grace-book-language', language); } catch { /* storage may be unavailable */ }
    document.documentElement.lang = language === 'am' ? 'am' : 'en';
  }, [language]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [likedFlyers, setLikedFlyers] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);

  const loadFlyers = useCallback(async () => {
    setLoading(true);
    let blockedUserIds: Set<string>;
    try {
      blockedUserIds = await getBlockedUserIds();
    } catch {
      showToast('Could not load your block list', 'error');
      setFlyers([]);
      setAuthors({});
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('flyers')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      showToast('Could not load flyers', 'error');
      setLoading(false);
      return;
    }
    const fetched = ((data as Flyer[]) ?? []).filter((flyer) => !blockedUserIds.has(flyer.user_id ?? ''));
    setFlyers(fetched);

    const authorIds = [...new Set(fetched.map((f) => f.user_id).filter(Boolean))] as string[];
    if (authorIds.length > 0) {
      const { data: profData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);
      const map: Record<string, Profile> = {};
      (profData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });

      // The signed-in user's AuthContext profile is already available even if the
      // public profile query does not return that row.
      if (user && profile && authorIds.includes(user.id) && !map[user.id]) {
        map[user.id] = profile;
      }
      if (profileError) {
        console.error('Could not load flyer author profiles:', profileError.message);
      }
      setAuthors(map);
    } else {
      setAuthors({});
    }

    if (user) {
      const { data: likes } = await supabase
        .from('flyer_likes')
        .select('flyer_id')
        .eq('user_id', user.id);
      setLikedFlyers(new Set((likes ?? []).map((l: { flyer_id: string }) => l.flyer_id)));
    }
    setLoading(false);
  }, [showToast, user, profile]);

  useEffect(() => { loadFlyers(); }, [loadFlyers]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(flyers.map((f) => f.category).filter(Boolean))) as string[];
    return ['all', ...cats];
  }, [flyers]);

  const filtered = useMemo(() => {
    return flyers.filter((f) => {
      const matchesCat = category === 'all' || f.category === category;
      const matchesType = typeFilter === 'all' || f.type === typeFilter;
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (f.title?.toLowerCase().includes(q)) ||
        (f.description?.toLowerCase().includes(q)) ||
        (f.text_content?.toLowerCase().includes(q));
      return matchesCat && matchesType && matchesSearch;
    });
  }, [flyers, category, typeFilter, search]);

  const toggleLike = useCallback(async (flyer: Flyer) => {
    if (!user) {
      showToast('Please sign in to like flyers', 'info');
      return;
    }
    const isLiked = likedFlyers.has(flyer.id);
    setLikedFlyers((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(flyer.id); else next.add(flyer.id);
      return next;
    });
    setFlyers((prev) => prev.map((f) =>
      f.id === flyer.id ? { ...f, likes_count: f.likes_count + (isLiked ? -1 : 1) } : f
    ));
    if (isLiked) {
      await supabase.from('flyer_likes').delete().eq('flyer_id', flyer.id).eq('user_id', user.id);
    } else {
      await supabase.from('flyer_likes').insert({ flyer_id: flyer.id, user_id: user.id });
    }
  }, [user, likedFlyers, showToast]);

  const handleDelete = useCallback(async (flyer: Flyer) => {
    if (!confirm('Delete this flyer?')) return;
    const { error } = await supabase.from('flyers').delete().eq('id', flyer.id);
    if (error) {
      showToast('Could not delete flyer', 'error');
      return;
    }
    setFlyers((prev) => prev.filter((f) => f.id !== flyer.id));
    showToast('Flyer deleted', 'info');
  }, [showToast]);

  const canDelete = (flyer: Flyer) => user?.id === flyer.user_id || profile?.is_admin;

  const handleShare = useCallback(async (flyer: Flyer) => {
    const shareUrl = user
      ? `https://grace-book-fixes.vercel.app/flyers?ref=${user.id}`
      : 'https://grace-book-fixes.vercel.app/flyers';
    console.log('Share URL:', shareUrl);
    const shareData = {
      title: flyer.title || 'Grace Book Flyer',
      text: flyer.description || flyer.text_content || flyer.title || 'Check out this gospel flyer on Grace Book',
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied', 'info');
      } catch {
        showToast('Could not copy link', 'error');
      }
    }
  }, [showToast, user]);

  const handleDownload = useCallback(async (flyer: Flyer) => {
    const images = flyer.images?.length ? flyer.images : [];
    if (images.length === 0) {
      showToast('No images to download', 'error');
      return;
    }
    try {
      for (let i = 0; i < images.length; i++) {
        showToast(`Downloading ${i + 1}/${images.length}...`, 'info');
        const proxyUrl = `/api/download?url=${encodeURIComponent(images[i])}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flyer-${Date.now()}-${i}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (i < images.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      await supabase.rpc('increment_flyer_downloads', { flyer_id: flyer.id });
      if (user) {
        await supabase.from('flyer_downloads').insert({ flyer_id: flyer.id, user_id: user.id });
      }
      showToast('Downloaded ✓', 'success');
    } catch {
      showToast('Download failed', 'error');
    }
  }, [showToast, user]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-950 py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-64 h-64 bg-gold-500 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-20 w-64 h-64 bg-primary-500 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-5">
            <div role="group" aria-label="Choose language / ቋንቋ ይምረጡ" className="inline-flex items-center rounded-full border border-white/25 bg-black/20 p-1 backdrop-blur-md shadow-lg">
              <button type="button" onClick={() => setLanguage('en')} aria-pressed={language === 'en'} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${language === 'en' ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:text-white'}`}>English</button>
              <button type="button" onClick={() => setLanguage('am')} aria-pressed={language === 'am'} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${language === 'am' ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:text-white'}`}>አማርኛ</button>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <ImageIcon className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-white/90 font-medium">{tr('Gospel Flyers', 'የወንጌል በራሪ ወረቀቶች')}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {tr('Gospel Flyers', 'የወንጌል በራሪ ወረቀቶች')}
          </h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            {tr('Discover and share beautiful gospel flyers. Swipe through images, like your favorites, and spread the Word.', 'ውብ የወንጌል ማስታወቂያዎችን ይመልከቱ እና ያጋሩ። ምስሎችን ይመልከቱ፣ የወደዷቸውን ይምረጡ፣ ቃሉንም ያስፋፉ።')}
          </p>
          {user && (
            <button onClick={() => setShowUpload(true)} className="btn-gold">
              <Plus className="h-5 w-5" /> {tr('Upload Flyer', 'ማስታወቂያ ይጫኑ')}
            </button>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="section-padding">
        <div className="container-narrow">
          {/* Type filter row */}
          <div className="flex gap-2 mb-4">
            {(['all', 'image', 'text'] as TypeFilter[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTypeFilter(tf)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  typeFilter === tf
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg shadow-gold-600/25'
                    : 'glass text-slate-600 dark:text-slate-300 hover:scale-105'
                }`}
              >
                {tf === 'all' ? 'All' : tf === 'image' ? 'Image' : 'Text'}
              </button>
            ))}
          </div>

          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    category === cat
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25'
                      : 'glass text-slate-600 dark:text-slate-300 hover:scale-105'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flyers..."
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="skeleton h-64 rounded-xl mb-3" />
                  <div className="skeleton h-5 w-3/4 rounded-lg mb-2" />
                  <div className="skeleton h-4 w-1/2 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-8 w-8 text-primary-500" />}
              title="No Flyers Yet"
              description={user ? "Be the first to share a gospel flyer!" : "Sign in to upload and share flyers."}
              action={user ? <button onClick={() => setShowUpload(true)} className="btn-primary"><Plus className="h-4 w-4" /> Upload Flyer</button> : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              {filtered.map((flyer, i) => (
                <FlyerCard
                  key={flyer.id}
                  flyer={flyer}
                  author={flyer.user_id ? authors[flyer.user_id] : undefined}
                  isLiked={likedFlyers.has(flyer.id)}
                  onLike={() => toggleLike(flyer)}
                  onShare={() => handleShare(flyer)}
                  onDownload={() => handleDownload(flyer)}
                  onDelete={() => handleDelete(flyer)}
                  canDelete={canDelete(flyer) ? true : false}
                  index={i}
                  language={language}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onUploaded={() => { setShowUpload(false); loadFlyers(); }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────  Flyer Card  ──────────────────────────────── */

function FlyerCard({
  flyer, author, isLiked, onLike, onShare, onDownload, onDelete, canDelete, index, language,
}: {
  flyer: Flyer;
  author?: Profile;
  isLiked: boolean;
  onLike: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDelete: () => void;
  canDelete: boolean;
  index: number;
  language: 'en' | 'am';
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showFull, setShowFull] = useState(false);
  const openAuthorProfile = () => {
    if (author?.id) navigate(`/profile?user=${encodeURIComponent(author.id)}`);
  };
  const [currentImage, setCurrentImage] = useState(0);
  const images = flyer.images?.length ? flyer.images : [];
  const touchStartX = useRef<number | null>(null);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1) % images.length);
  };
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) setCurrentImage((p) => (p + 1) % images.length);
      else setCurrentImage((p) => (p - 1 + images.length) % images.length);
    }
    touchStartX.current = null;
  };

  // ── Text flyer card — same 3:4 visual footprint as image flyers ──
  if (flyer.type === 'text') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.04, 0.4) }}
          className="glass-card overflow-hidden group hover:shadow-xl transition-shadow duration-300"
        >
          {/* Poster area matches the image flyer aspect ratio */}
          <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-100 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/50">
            <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full border-[18px] border-amber-300 dark:border-amber-700" />
              <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full border-[14px] border-orange-300 dark:border-orange-800" />
            </div>
            <div className="relative z-[1] h-full flex flex-col p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-1.5">
                <span aria-hidden="true">✦</span> A Message of Hope
              </p>
              {flyer.title && (
                <h3 className="font-bold text-lg sm:text-xl leading-snug mb-3 line-clamp-3 text-slate-900 dark:text-white">
                  {flyer.title}
                </h3>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap line-clamp-[8]">
                  {flyer.text_content}
                </p>
              </div>
              {flyer.prayer_count > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 font-medium">
                  🙏 {flyer.prayer_count} prayed
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                {flyer.category && (
                  <span className="shrink-0 max-w-[42%] truncate px-2 py-1.5 rounded-lg bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200 text-[11px] font-semibold">
                    {flyer.category}
                  </span>
                )}
                <button
                  onClick={() => setShowFull(true)}
                  className="min-w-0 flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm py-2.5 px-3 shadow-sm transition-colors"
                >
                  Read more · 🙏 Pray
                </button>
              </div>
            </div>
          </div>

          {/* Match the image card's author and action footer */}
          <div className="p-4">
            {author && (
              <div className="flex items-center gap-2 mb-3 min-w-0">
                <div onClick={openAuthorProfile} className="w-6 h-6 shrink-0 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden cursor-pointer">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getAuthorName(author).charAt(0).toUpperCase()
                  )}
                </div>
                <p onClick={openAuthorProfile} className="text-xs font-medium truncate cursor-pointer">{getAuthorName(author)}</p>
                <p className="text-xs text-slate-400 ml-auto shrink-0">{timeAgo(flyer.created_at)}</p>
              </div>
            )}
            <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={onLike}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                aria-label="Like flyer"
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
                {flyer.likes_count > 0 && flyer.likes_count}
              </button>
              <button
                onClick={() => setShowFull(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                aria-label="Read full message and prayer"
              >
                <Type className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowFull(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20 transition-all"
                aria-label="Pray with this message"
              >
                🙏 Pray
              </button>
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ml-auto"
                aria-label="Share flyer"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {canDelete && (
                <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" aria-label="Delete flyer">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          {showFull && (
            <TextFlyerModal
              flyer={flyer}
              author={author}
              onClose={() => setShowFull(false)}
              onLike={onLike}
              isLiked={isLiked}
              showToast={showToast}
              language={language}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

    // ── Image flyer card (unchanged) ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="glass-card overflow-hidden group hover:shadow-xl transition-shadow duration-300"
    >
      {/* Image Carousel */}
      {images.length > 0 && (
        <div
          className="relative aspect-[3/4] overflow-hidden bg-slate-100 dark:bg-slate-800"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <motion.img
            key={currentImage}
            src={images[currentImage]}
            alt={flyer.title || 'Flyer'}
            className="w-full h-full object-cover"
            initial={{ opacity: 0.5, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            loading="lazy"
            draggable={false}
          />

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImage ? 'bg-white w-4' : 'bg-white/50'}`}
                  />
                ))}
              </div>

              {/* Counter */}
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                {currentImage + 1}/{images.length}
              </span>
            </>
          )}

        </div>
      )}

      {/* Card body */}
      <div className="p-4">
        {flyer.title && (
          <h3 className="font-bold text-base mb-1 line-clamp-2">{flyer.title}</h3>
        )}
        {flyer.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-3">
            {flyer.description}
          </p>
        )}

        {/* Author */}
        {author && (
          <div className="flex items-center gap-2 mb-3">
            <div onClick={openAuthorProfile} className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                getAuthorName(author).charAt(0).toUpperCase()
              )}
            </div>
            <p onClick={openAuthorProfile} className="text-xs font-medium truncate">{getAuthorName(author)}</p>
            <p className="text-xs text-slate-400 ml-auto">{timeAgo(flyer.created_at)}</p>
          </div>
        )}

        {/* Category and actions — keep the category away from image content */}
        <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/50">
          {flyer.category && (
            <span className="mr-1 max-w-[34%] shrink-0 truncate px-2 py-1.5 rounded-lg bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200 text-[11px] font-semibold">
              {flyer.category}
            </span>
          )}
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isLiked
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
            {flyer.likes_count > 0 && flyer.likes_count}
          </button>

          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ml-auto"
          >
            <Share2 className="h-4 w-4" />
          </button>

          {canDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              aria-label="Delete flyer"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────  Text Flyer Modal  ──────────────────────────── */

function TextFlyerModal({
  flyer, author, onClose, onLike, isLiked, showToast, language,
}: {
  flyer: Flyer;
  author?: Profile;
  onClose: () => void;
  onLike: () => void;
  isLiked: boolean;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
  language: 'en' | 'am';
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasPrayed, setHasPrayed] = useState(false);
  const [prayerCount, setPrayerCount] = useState(flyer.prayer_count ?? 0);
  const [checking, setChecking] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase
        .from('flyer_prayers')
        .select('flyer_id')
        .eq('flyer_id', flyer.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setHasPrayed(true);
      setChecking(false);
    };
    check();
  }, [flyer.id, user]);

  const openAuthorProfile = () => {
    if (author?.id) {
      onClose();
      navigate(`/profile?user=${encodeURIComponent(author.id)}`);
    }
  };

  const handlePray = async () => {
    if (!user || hasPrayed) return;
    setHasPrayed(true);
    setPrayerCount((c) => c + 1);
    const { error: insErr } = await supabase
      .from('flyer_prayers')
      .insert({ flyer_id: flyer.id, user_id: user.id });
    if (insErr) {
      setHasPrayed(false);
      setPrayerCount((c) => c - 1);
      showToast('Could not record your prayer', 'error');
      return;
    }
    await supabase
      .from('flyers')
      .update({ prayer_count: prayerCount + 1 })
      .eq('id', flyer.id);
    setShowCelebration(true);
    showToast('Your prayer has been recorded 🙏', 'success');
  };

  const goToNextStep = (path: string) => {
    setShowCelebration(false);
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence mode="wait">
      {showCelebration ? (
        <motion.div
          key="prayer-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { setShowCelebration(false); onClose(); }}
          className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 pt-8 pb-7 text-center text-white">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full border-[14px] border-white/15" />
              <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full border-[16px] border-white/10" />
              <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/20">
                <Sparkles className="h-8 w-8" />
              </div>
              <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-white/85">{language === 'am' ? 'ቀጣዩ እርምጃዎ' : 'Your next step'}</p>
              <h2 className="relative mt-2 text-2xl sm:text-3xl font-extrabold leading-tight">{language === 'am' ? 'እግዚአብሔር ይወድዎታል! ❤️' : 'You are loved by God! ❤️'}</h2>
              <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/95">{language === 'am' ? 'ለመጸለይ ጊዜ ስለወሰዱ እናመሰግናለን። እግዚአብሔርን መፈለግዎን፣ ቃሉን መማርዎን እና በእምነት ማደግዎን ይቀጥሉ።' : 'Thank you for taking a moment to pray. Keep seeking God, learning His Word, and growing in faith—one step at a time.'}</p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">{language === 'am' ? '📖 አብረው የሚይዙት የመጽሐፍ ቅዱስ ጥቅስ' : '📖 A verse to carry with you'}</p>
                <p className="mt-2 text-sm italic leading-relaxed text-slate-800 dark:text-slate-100">“But grow in the grace and knowledge of our Lord and Savior Jesus Christ.”</p>
                <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">2 Peter 3:18</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{language === 'am' ? 'ዛሬ ሁሉንም ማወቅ አያስፈልግዎትም። ከኢየሱስ ጋር መጓዝዎን ይቀጥሉ፣ እምነትዎም በየቀኑ ያድግ።' : "You don't have to know everything today. Keep walking with Jesus and let your faith grow day by day."}</p>
              </div>

              <p className="mb-3 text-sm font-bold">{language === 'am' ? 'ቀጣዩን እርምጃ ይምረጡ' : 'Choose your next step'}</p>
              <div className="space-y-3">
                <button onClick={() => goToNextStep('/bible')} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:hover:border-amber-600 dark:hover:bg-slate-800">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><BookOpen className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{language === 'am' ? 'በእግዚአብሔር ቃል ያድጉ' : "Grow in God's Word"}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{language === 'am' ? 'መጽሐፍ ቅዱስን ያንብቡ እና በቃሉ ላይ ያሰላስሉ።' : 'Read the Bible and reflect on Scripture.'}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1" />
                </button>
                <button onClick={() => goToNextStep('/churches')} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:hover:border-amber-600 dark:hover:bg-slate-800">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Church className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{language === 'am' ? 'የቤተ ክርስቲያን ቤተሰብዎን ያግኙ' : 'Find your church family'}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{language === 'am' ? 'የቤተ ክርስቲያናትን ዝርዝር ይመልከቱ እና ይገናኙ።' : 'Explore the church directory and connect.'}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1" />
                </button>
                <button onClick={() => goToNextStep('/courses')} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:hover:border-amber-600 dark:hover:bg-slate-800">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><GraduationCap className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{language === 'am' ? 'እንደ ደቀ መዝሙር ያድጉ' : 'Grow as a disciple'}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{language === 'am' ? 'በራስዎ ፍጥነት የደቀ መዝሙርነት ትምህርቶችን ይመልከቱ።' : 'Explore discipleship courses at your pace.'}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1" />
                </button>
              </div>
              <button onClick={() => { setShowCelebration(false); onClose(); }} className="mt-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{language === 'am' ? 'Grace Bookን ማሰስ ይቀጥሉ' : 'Continue exploring Grace Book'}</button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">{language === 'am' ? 'ይህ በጉዞዎ ውስጥ አንድ እርምጃ ነው። ጊዜዎን ይውሰዱ፣ ጥያቄዎችን ይጠይቁ፣ ማደግዎንም ይቀጥሉ።' : 'This is one step in your journey. Take your time, ask questions, and keep growing.'}</p>
            </div>
          </motion.div>
        </motion.div>
      ) : (
      <motion.div
        key="text-tract-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
        >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1">
            🙏 A Message of Hope
          </p>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Title */}
        {flyer.title && (
          <h3 className="text-xl font-bold mb-4">{flyer.title}</h3>
        )}

        {/* Full text content */}
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap mb-4">
          {flyer.text_content}
        </p>

        {/* Bible reference */}
        {flyer.bible_reference && (
          <div className="mb-4 pl-4 border-l-4 border-gold-400 bg-gold-50 dark:bg-gold-900/10 rounded-r-lg py-2 pr-3">
            <p className="text-sm italic text-gold-700 dark:text-gold-300">
              {flyer.bible_reference}
            </p>
          </div>
        )}

        {/* Prayer text */}
        {flyer.prayer_text && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-gold-100 to-gold-50 dark:from-gold-900/20 dark:to-gold-800/10 border border-gold-200 dark:border-gold-800/30">
            <p className="text-xs font-semibold text-gold-700 dark:text-gold-300 mb-2 flex items-center gap-1">
              🙏 Covenant Prayer
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {flyer.prayer_text}
            </p>
          </div>
        )}

        {/* Pray button */}
        <button
          onClick={handlePray}
          disabled={hasPrayed || checking || !user}
          className={`btn-primary w-full mb-2 ${
            hasPrayed ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {hasPrayed ? '🙏 You prayed' : '🙏 I prayed this'}
        </button>

        {!user && (
          <p className="text-xs text-slate-400 text-center mb-2">Sign in to pray</p>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {prayerCount} {prayerCount === 1 ? 'person' : 'people'} prayed this
        </p>

        {/* Author + Like */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
          {author && (
            <div className="flex items-center gap-2">
              <div onClick={openAuthorProfile} className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {author?.avatar_url ? (
                  <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getAuthorName(author).charAt(0).toUpperCase()
                )}
              </div>
              <p onClick={openAuthorProfile} className="text-xs font-medium truncate">{getAuthorName(author)}</p>
            </div>
          )}
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isLiked
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
            {flyer.likes_count > 0 && flyer.likes_count}
          </button>
        </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────  Upload Modal  ──────────────────────────── */

const MAX_IMAGES = 5;

function UploadModal({ onClose, onUploaded, showToast }: {
  onClose: () => void;
  onUploaded: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void;
  language: 'en' | 'am';
}) {
  const { user } = useAuth();
  const [flyerType, setFlyerType] = useState<FlyerType>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text tract fields
  const [textContent, setTextContent] = useState('');
  const [bibleReference, setBibleReference] = useState('');
  const [prayerText, setPrayerText] = useState('');

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      showToast(`Maximum ${MAX_IMAGES} images per flyer`, 'warning');
      return;
    }
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        const url = await uploadToCloudinary(file, 'image');
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
      showToast(`${urls.length} image(s) uploaded`, 'success');
    } catch {
      showToast('Upload failed. Please try again.', 'error');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('Please add a title', 'warning');
      return;
    }
    if (flyerType === 'image' && images.length === 0) {
      showToast('Please upload at least one image', 'warning');
      return;
    }
    if (flyerType === 'text' && !textContent.trim()) {
      showToast('Please add a message', 'warning');
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      user_id: user!.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      type: flyerType,
      text_content: flyerType === 'text' ? textContent.trim() : null,
      bible_reference: flyerType === 'text' ? (bibleReference.trim() || null) : null,
      prayer_text: flyerType === 'text' ? (prayerText.trim() || null) : null,
    };
    if (flyerType === 'image') {
      payload.images = images;
    } else {
      payload.images = [];
    }
    const { error } = await supabase.from('flyers').insert(payload);
    setSaving(false);
    if (error) {
      showToast('Could not create flyer', 'error');
      return;
    }
    showToast('Flyer published!', 'success');
    await awardPoints(user!.id, 'flyer_create', POINTS.FLYER_CREATE);
    showToast(`+${POINTS.FLYER_CREATE} points earned`, 'success');
    onUploaded();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Upload Gospel Flyer</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setFlyerType('image')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                flyerType === 'image'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <ImageIcon className="h-4 w-4" /> Image
            </button>
            <button
              onClick={() => setFlyerType('text')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                flyerType === 'text'
                  ? 'bg-white dark:bg-slate-700 text-gold-600 dark:text-gold-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <Type className="h-4 w-4" /> Text
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Flyer title..."
              className="input-field"
            />
          </div>

          {/* Description (image only) */}
          {flyerType === 'image' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this flyer..."
                className="input-field min-h-[80px] resize-y"
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* ── Text tract fields ── */}
          {flyerType === 'text' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Share a message of hope and salvation..."
                  className="input-field min-h-[120px] resize-y"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Bible verse (optional)</label>
                <input
                  value={bibleReference}
                  onChange={(e) => setBibleReference(e.target.value)}
                  placeholder="e.g. John 3:16"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Prayer (optional)</label>
                <textarea
                  value={prayerText}
                  onChange={(e) => setPrayerText(e.target.value)}
                  placeholder="A prayer for the reader..."
                  className="input-field min-h-[80px] resize-y"
                />
              </div>
            </>
          )}

          {/* ── Image upload (image only) ── */}
          {flyerType === 'image' && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Images ({images.length}/{MAX_IMAGES})
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="input-field"
                disabled={uploading || images.length >= MAX_IMAGES}
              />
              {uploading && (
                <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" /> Uploading...
                </p>
              )}

              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="btn-primary flex-1"
            >
              {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {saving ? 'Publishing...' : 'Publish Flyer'}
            </button>
            <button onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}