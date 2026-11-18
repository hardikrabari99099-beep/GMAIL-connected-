import { useState } from "react";
import { Play, Quote, Star, TrendingUp, Video, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { useSettings } from "../context/SettingsContext";
import { getReviewMedia, safeReviewImage, youtubeId } from "../lib/review-media";

function videoThumbnail(item, media) {
  const poster = safeReviewImage(item.poster);
  if (poster) return poster;
  if (media.kind === "youtube") {
    const id = youtubeId(media.url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
  }
  return undefined;
}

function VideoTile({ item, onOpen, decorative }) {
  const media = getReviewMedia(item.url);
  if (!media) return null;
  const thumb = videoThumbnail(item, media);
  return (
    <button
      type="button"
      className="wall-video"
      onClick={() => onOpen(item)}
      tabIndex={decorative ? -1 : 0}
      aria-label={`Watch ${item.name || "trader"}'s short review with sound`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={item.name ? `${item.name} review thumbnail` : "Trader review"}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="w-full h-full grid place-items-center bg-[var(--bg-1)] text-[var(--muted)]">
          <Video size={28} />
        </span>
      )}
      <span className="wall-video-shade" />
      <span className="wall-video-sound">
        <Volume2 size={13} /> Short · Sound
      </span>
      <span className="wall-video-meta">
        <strong>{item.name || "IndiFunded trader"}</strong>
        <span>{item.label || item.role || "Trader review"}</span>
      </span>
      <span className="wall-video-play">
        <Play fill="currentColor" size={16} />
      </span>
    </button>
  );
}

function QuoteTile({ item, accent }) {
  return (
    <article className={`review-quote ${accent ? "review-quote-accent" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1 text-primary">
          {Array.from({ length: 5 }, (_, j) => (
            <Star key={j} size={13} fill="currentColor" />
          ))}
        </div>
        <Quote size={18} className="text-muted-foreground" />
      </div>
      <blockquote>“{item.q}”</blockquote>
      <div className="review-author">
        <span className="review-avatar">{(item.a || "T").slice(0, 1)}</span>
        <div>
          <strong>{item.a}</strong>
          <span>{item.r}</span>
        </div>
      </div>
    </article>
  );
}

function StatTile() {
  return (
    <div className="wall-stat" aria-hidden="true">
      <TrendingUp size={18} />
      <svg viewBox="0 0 200 60" preserveAspectRatio="none">
        <path d="M0 50 L25 42 L50 46 L75 30 L100 34 L125 18 L150 24 L175 8 L200 12" />
      </svg>
      <strong className="font-display">70%</strong>
      <span>Profit split for funded traders</span>
    </div>
  );
}

export default function ClientReviews({ quotesOnly = false, heading = "" }) {
  const { settings } = useSettings();
  const cfg = settings.video_reviews || {};
  const videos = quotesOnly
    ? []
    : (cfg.items || []).filter((item) => item.enabled !== false && getReviewMedia(item.url || ""));
  const reviews = settings.testimonials || [];
  const [active, setActive] = useState(null);
  const [failed, setFailed] = useState(false);
  const media = active ? getReviewMedia(active.url) : null;
  const isVerticalModal =
    media?.kind === "video" || /youtube\.com\/shorts\//i.test(String(active?.url || ""));

  if (cfg.enabled === false || (!videos.length && !reviews.length)) return null;

  // Mix short videos and written quotes across the scrolling review columns
  const tiles = [];
  const max = Math.max(videos.length, reviews.length);
  for (let i = 0; i < max; i++) {
    if (videos[i]) tiles.push({ type: "video", item: videos[i] });
    if (reviews[i]) tiles.push({ type: "quote", item: reviews[i] });
    if (i === 0) tiles.push({ type: "stat" });
  }
  const columns = [0, 1, 2].map((c) => {
    const own = tiles.filter((_, i) => i % 3 === c);
    return own.length >= 2 ? own : [...tiles.slice(c), ...tiles.slice(0, c)];
  });
  const open = (item) => {
    setFailed(false);
    setActive(item);
  };

  const render = (t, key, decorative, i) =>
    t.type === "video" ? (
      <VideoTile key={key} item={t.item} onOpen={open} decorative={decorative} />
    ) : t.type === "stat" ? (
      <StatTile key={key} />
    ) : (
      <QuoteTile key={key} item={t.item} accent={i % 3 === 1} />
    );

  return (
    <section className="home-band reviews-band" data-testid="client-reviews">
      <div className="container-xl">
        <div className="home-section-heading reviews-heading">
          <div>
            <div className="home-eyebrow">Trader voices</div>
            <h2 className="font-display">
              {heading || cfg.heading || "The people behind the payouts"}
            </h2>
            <p>{cfg.subtitle || "Short trader video stories & verified reviews."}</p>
          </div>
        </div>
        <div className="review-wall" data-testid="video-review-track">
          {columns.map((list, c) => {
            const half = list.length >= 2 ? list : [...list, ...list];
            return (
              <div className={`review-col review-col-${c}`} key={c}>
                <div className="review-col-track">
                  {[0, 1].map((r) => half.map((t, i) => render(t, `${r}-${i}`, r > 0, i + c)))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Dialog
        open={!!active}
        onOpenChange={(value) => {
          if (!value) setActive(null);
        }}
      >
        <DialogContent className={isVerticalModal ? "max-w-md" : "max-w-4xl"}>
          <DialogTitle>{active?.name || "Trader"}'s review</DialogTitle>
          <DialogDescription>{active?.role || "IndiFunded trading journey"}</DialogDescription>
          {media &&
            !failed &&
            (media.kind === "video" ? (
              <video
                className={isVerticalModal ? "review-player-vertical" : "review-player"}
                src={media.url}
                controls
                autoPlay
                playsInline
                onError={() => setFailed(true)}
              />
            ) : (
              <iframe
                className={isVerticalModal ? "review-player-vertical" : "review-player"}
                src={media.url}
                title={`${active?.name}'s video review`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ))}
          {failed && (
            <p role="alert" className="text-muted-foreground">
              This video is unavailable right now.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
