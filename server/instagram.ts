// Instagram check for ambassador applications: their public numbers through Meta's Business
// Discovery API (our own Instagram professional account looks theirs up), then an estimate of how
// genuine the audience is, from how people engage with their recent posts.
//
// Set INSTAGRAM_USER_ID (our Instagram professional account's id) and INSTAGRAM_ACCESS_TOKEN (a
// long-lived token for it from a Meta app) in Render. Only creator and business accounts can be
// looked up; a personal or private account is left for the team to check by hand.
//
// Nobody outside Instagram can see who the followers are, so this is an estimate, not a count of
// fake followers. Each point taken off says why, so the team can judge for themselves.

export class InstagramError extends Error {
  declare status: any;
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const POSTS = 12;

export function createInstagram({ token = "", userId = "", baseUrl = "", version = "" } = {}) {
  const base = (baseUrl || "https://graph.facebook.com").replace(/\/$/, "");
  const v = version || "v25.0";
  const configured = () => Boolean(token && userId);

  // Their profile and last posts: { username, name, followers, posts, bio, recent: [{ likes, comments, at }] }.
  async function profile(handle) {
    if (!configured()) throw new InstagramError("Instagram isn't connected yet.", 503);
    const username = String(handle || "").trim().replace(/^@/, "");
    if (!/^[\w.]{1,30}$/.test(username)) throw new InstagramError("That isn't an Instagram username.", 400);
    const fields = `business_discovery.username(${username}){username,name,followers_count,media_count,biography,profile_picture_url,media.limit(${POSTS}){like_count,comments_count,timestamp,media_type}}`;
    const url = `${base}/${v}/${encodeURIComponent(userId)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      const msg = String(data.error?.message || "");
      // Personal and private accounts, and names that don't exist, all come back as "not found".
      if (/cannot be found|does not exist|not a business|invalid user/i.test(msg) || data.error?.code === 110) throw new InstagramError("Couldn't see this account: it may be personal, private or misspelled. Check it by hand.", 404);
      if (data.error?.code === 190) throw new InstagramError("The Instagram connection has expired and needs reconnecting.", 503);
      throw new InstagramError("Instagram didn't respond. Try again later.");
    }
    const d = data.business_discovery || {};
    return {
      username: d.username || username,
      name: d.name || "",
      followers: Number(d.followers_count) || 0,
      posts: Number(d.media_count) || 0,
      bio: d.biography || "",
      avatar: d.profile_picture_url || "",
      recent: (d.media?.data || []).map((m) => ({ likes: m.like_count ?? null, comments: Number(m.comments_count) || 0, at: m.timestamp || null })),
    };
  }

  return { configured, profile };
}

// What engagement looks like for an account this size (likes and comments per post, over
// followers). Wider for smaller accounts, whose followers tend to be closer to them.
const expected = (followers) => (followers < 10_000 ? [0.02, 0.08] : followers < 50_000 ? [0.012, 0.05] : followers < 250_000 ? [0.008, 0.035] : [0.005, 0.025]);
const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

// An estimate of how genuine their audience is, 0–95, from their public numbers:
// { score, level: "genuine" | "review" | "suspect", engagement, normal: [lo, hi], reasons: [{ text, tone }] }.
// genuine 75+, review 50–74, suspect under 50. Without likes (hidden) it can't be sure: review at best.
export function authenticity(p) {
  const reasons = [];
  let score = 100;
  const off = (n, text) => {
    score -= n;
    reasons.push({ text, tone: "bad" });
  };
  const good = (text) => reasons.push({ text, tone: "good" });
  const posts = p.recent || [];
  const withLikes = posts.filter((m) => m.likes != null);
  const [lo, hi] = expected(p.followers);

  if (p.followers < 300) off(20, `Only ${p.followers} followers.`);
  if (!posts.length) {
    off(40, "No posts to look at.");
    return { score: Math.max(0, score), level: "suspect", engagement: null, normal: [lo, hi], reasons };
  }

  // Engagement for the size of the account: far below usual is the clearest sign of bought followers.
  let engagement = null;
  if (withLikes.length >= 3 && p.followers > 0) {
    engagement = withLikes.reduce((n, m) => n + m.likes + m.comments, 0) / withLikes.length / p.followers;
    if (engagement < lo * 0.25) off(45, `Engagement ${pct(engagement, 2)}, far below the ${pct(lo)}–${pct(hi)} usual for ${short(p.followers)} followers. Often a sign of bought followers.`);
    else if (engagement < lo * 0.5) off(28, `Engagement ${pct(engagement, 2)}, well below the ${pct(lo)}–${pct(hi)} usual for ${short(p.followers)} followers.`);
    else if (engagement < lo) off(10, `Engagement ${pct(engagement, 2)}, a little below the ${pct(lo)}–${pct(hi)} usual for this size.`);
    else if (engagement > hi * 3) off(15, `Engagement ${pct(engagement)} is unusually high for this size. Can mean bought likes or engagement groups.`);
    else good(`Engagement ${pct(engagement)}, normal for ${short(p.followers)} followers.`);

    // Comments against likes: almost none can mean bought likes; a flood can mean comment groups.
    const likes = withLikes.reduce((n, m) => n + m.likes, 0);
    const comments = withLikes.reduce((n, m) => n + m.comments, 0);
    const ratio = likes ? comments / likes : 0;
    if (likes > 200 && ratio < 0.003) off(15, `Very few comments for the likes (${comments} on ${short(likes)} likes).`);
    else if (ratio > 0.25 && comments > 30) off(10, "Many comments for the likes. Can mean giveaways or comment groups.");
    else if (likes > 0) good("Comments and likes in a normal balance.");

    // Real audiences are uneven from post to post; bought likes are often nearly the same each time.
    if (withLikes.length >= 6) {
      const mean = likes / withLikes.length;
      const spread = Math.sqrt(withLikes.reduce((n, m) => n + (m.likes - mean) ** 2, 0) / withLikes.length) / (mean || 1);
      if (mean > 50 && spread < 0.08) off(12, "Likes are nearly identical on every post.");
    }
  } else {
    off(10, "Likes are hidden, so engagement can't be measured. Check it by hand.");
    score = Math.min(score, 74);
  }

  // Still posting?
  const recent = posts.filter((m) => m.at && Date.now() - Date.parse(m.at) < 90 * 864e5).length;
  if (!recent) off(20, "No posts in the last 90 days.");
  else if (recent < 3) off(5, `Only ${recent} post${recent === 1 ? "" : "s"} in the last 90 days.`);
  else good(`${recent} posts in the last 90 days.`);

  // Never 100: it's an estimate from the outside.
  score = Math.max(0, Math.min(95, Math.round(score)));
  return { score, level: score >= 75 ? "genuine" : score >= 50 ? "review" : "suspect", engagement, normal: [lo, hi], reasons };
}
