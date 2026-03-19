import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  let content: string;
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    console.warn(".env.local not found – falling back to existing environment variables");
    return;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Set them in .env.local or as environment variables."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TemplateRow {
  category: string;
  variant_name: string;
  action: string;
  location: string;
  wardrobe: string;
  lighting: string;
  camera_angle: string;
  audio_track: string | null;
  content_tier: "standard" | "premium" | "social";
  platforms: string | null;
}

const templates: TemplateRow[] = [
  // ── Training (6) ──────────────────────────────────────────────────────
  {
    category: "Training",
    variant_name: "Weight Room Power",
    action: "Athlete performs heavy deadlifts with chalk dust rising from their hands",
    location: "Modern university weight room with branded wall graphics",
    wardrobe: "Fitted compression shirt and training shorts, team colors",
    lighting: "Overhead fluorescent mixed with dramatic side spotlights",
    camera_angle: "Low-angle tracking shot rising as the bar lifts",
    audio_track: "Intense trap beat with bass drops",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok",
  },
  {
    category: "Training",
    variant_name: "Sprint Drills",
    action: "Athlete explodes through agility ladder drills on a turf field",
    location: "Outdoor practice turf with yard-line markings",
    wardrobe: "Sleeveless training top, compression tights, cleats",
    lighting: "Golden hour sunlight casting long shadows across the field",
    camera_angle: "Side-tracking dolly shot at knee height",
    audio_track: null,
    content_tier: "standard",
    platforms: "Instagram Reels, YouTube Shorts",
  },
  {
    category: "Training",
    variant_name: "Court Work",
    action: "Athlete does crossover dribble drills and finishes with a reverse layup",
    location: "Empty indoor basketball court with polished hardwood",
    wardrobe: "Basketball shorts, branded sneakers, shooting sleeve",
    lighting: "Arena overhead lights with slight haze for atmosphere",
    camera_angle: "Steadicam following from half court to the rim",
    audio_track: "Lo-fi hip-hop beat",
    content_tier: "standard",
    platforms: "TikTok",
  },
  {
    category: "Training",
    variant_name: "Pool Recovery",
    action: "Athlete performs underwater recovery exercises in a hydrotherapy pool",
    location: "Sports medicine facility with blue-tiled pool",
    wardrobe: "Athletic swimwear, swim cap",
    lighting: "Underwater LED lights creating blue-green ambient glow",
    camera_angle: "Split-level shot half above and half below the waterline",
    audio_track: "Ambient electronic with muffled underwater tones",
    content_tier: "premium",
    platforms: "Instagram Reels",
  },
  {
    category: "Training",
    variant_name: "Morning Run",
    action: "Athlete runs along a scenic trail at sunrise with breath visible in cool air",
    location: "Tree-lined campus trail with morning fog",
    wardrobe: "Lightweight running jacket, leggings, trail shoes",
    lighting: "Soft dawn light filtering through trees",
    camera_angle: "Drone shot pulling back to reveal the full trail",
    audio_track: "Motivational orchestral build",
    content_tier: "premium",
    platforms: "YouTube Shorts, Instagram Reels",
  },
  {
    category: "Training",
    variant_name: "Batting Cage",
    action: "Athlete takes powerful swings in a batting cage, sending balls into the net",
    location: "Indoor batting cage facility with netting and rubber mats",
    wardrobe: "Baseball pants, batting gloves, team practice jersey",
    lighting: "Bright overhead cage lights with slight shadow on the batter",
    camera_angle: "Slow-motion side profile capturing the full swing arc",
    audio_track: null,
    content_tier: "standard",
    platforms: "Instagram Reels, TikTok",
  },

  // ── Game Day (6) ──────────────────────────────────────────────────────
  {
    category: "Game Day",
    variant_name: "Tunnel Walk",
    action: "Athlete walks through the stadium tunnel toward the field, crowd noise building",
    location: "Concrete stadium tunnel with light at the far end",
    wardrobe: "Full game-day uniform with helmet in hand",
    lighting: "Dramatic backlight from the stadium opening, dim tunnel interior",
    camera_angle: "Tracking shot from behind transitioning to front-facing reveal",
    audio_track: "Epic cinematic build with crowd roar",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok, YouTube Shorts",
  },
  {
    category: "Game Day",
    variant_name: "Pre-Game Warm-Up",
    action: "Athlete stretches and jogs on the field while fans fill the stadium",
    location: "Home stadium field with stands in background",
    wardrobe: "Warm-up tracksuit over game jersey",
    lighting: "Late afternoon stadium lights mixing with fading daylight",
    camera_angle: "Wide establishing shot tightening to medium close-up",
    audio_track: "Upbeat hip-hop instrumental",
    content_tier: "standard",
    platforms: "Instagram Stories",
  },
  {
    category: "Game Day",
    variant_name: "Locker Room Focus",
    action: "Athlete sits in front of their locker, headphones on, eyes closed in concentration",
    location: "Team locker room with nameplate visible above the locker",
    wardrobe: "Game jersey partially on, shoulder pads visible",
    lighting: "Moody overhead lockers lights with warm wood tones",
    camera_angle: "Slow push-in from medium shot to tight close-up on face",
    audio_track: "Muted ambient with heartbeat undertone",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok",
  },
  {
    category: "Game Day",
    variant_name: "National Anthem",
    action: "Athlete stands at attention on the sideline during the national anthem, hand over heart",
    location: "Stadium sideline with packed crowd and American flag",
    wardrobe: "Full game-day uniform",
    lighting: "Evening stadium lights with American flag spotlit",
    camera_angle: "Medium shot with shallow depth of field, crowd bokeh",
    audio_track: null,
    content_tier: "standard",
    platforms: "Instagram, Twitter/X",
  },
  {
    category: "Game Day",
    variant_name: "Kickoff Energy",
    action: "Athlete sprints downfield on kickoff with teammates alongside",
    location: "Stadium field at the 50-yard line, night game",
    wardrobe: "Full game uniform with eye black",
    lighting: "Bright stadium floodlights, slight lens flare",
    camera_angle: "Tracking shot from the sideline, slow-motion impact",
    audio_track: "High-energy EDM drop",
    content_tier: "premium",
    platforms: "TikTok, YouTube Shorts",
  },
  {
    category: "Game Day",
    variant_name: "Shootaround",
    action: "Athlete sinks three consecutive three-pointers during shootaround",
    location: "Arena court with team banners hanging from rafters",
    wardrobe: "Warm-up shooting shirt and shorts",
    lighting: "Full arena lights, scoreboard glowing in background",
    camera_angle: "Behind-the-basket angle looking back at the shooter",
    audio_track: "Clean hip-hop beat",
    content_tier: "standard",
    platforms: "Instagram Reels",
  },

  // ── Lifestyle (6) ─────────────────────────────────────────────────────
  {
    category: "Lifestyle",
    variant_name: "Campus Walk",
    action: "Athlete walks across campus carrying a backpack, greeting friends along the way",
    location: "University quad with historic buildings and fall foliage",
    wardrobe: "Casual streetwear — hoodie, joggers, fresh sneakers",
    lighting: "Soft overcast daylight with autumn warmth",
    camera_angle: "Walking steadicam shot from slightly ahead at eye level",
    audio_track: "Chill R&B instrumental",
    content_tier: "social",
    platforms: "TikTok, Instagram Reels",
  },
  {
    category: "Lifestyle",
    variant_name: "Meal Prep",
    action: "Athlete prepares a high-protein meal in a clean modern kitchen",
    location: "Bright apartment kitchen with marble countertops",
    wardrobe: "Casual athleisure — fitted tee and joggers",
    lighting: "Natural window light supplemented by warm under-cabinet LEDs",
    camera_angle: "Overhead birds-eye intercut with side profile shots",
    audio_track: "Upbeat lo-fi acoustic",
    content_tier: "social",
    platforms: "TikTok, YouTube Shorts",
  },
  {
    category: "Lifestyle",
    variant_name: "Study Session",
    action: "Athlete studies at a library desk with laptop and textbooks, then looks up confidently",
    location: "University library with tall bookshelves and warm wood tables",
    wardrobe: "Team-branded quarter-zip pullover and glasses",
    lighting: "Warm desk lamp light mixed with soft overhead library lighting",
    camera_angle: "Slow dolly across the desk, ending on a portrait-style close-up",
    audio_track: "Soft piano ambient",
    content_tier: "social",
    platforms: "Instagram, TikTok",
  },
  {
    category: "Lifestyle",
    variant_name: "Car Arrival",
    action: "Athlete steps out of a luxury SUV in a parking lot and walks toward the camera",
    location: "Stadium VIP parking lot at dusk",
    wardrobe: "Sharp casual — leather jacket, fitted jeans, designer sunglasses",
    lighting: "Dusk sky with car headlights and parking lot lamp glow",
    camera_angle: "Low wide-angle shot from ground level looking up",
    audio_track: "Hard-hitting trap beat",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok",
  },
  {
    category: "Lifestyle",
    variant_name: "Morning Routine",
    action: "Athlete goes through morning routine — alarm, stretch, smoothie, out the door",
    location: "Modern athlete apartment and doorstep",
    wardrobe: "Sleepwear transitioning to workout gear",
    lighting: "Early morning blue tones warming to golden as they step outside",
    camera_angle: "Quick-cut montage with close-ups on details",
    audio_track: "Trending TikTok audio bed",
    content_tier: "social",
    platforms: "TikTok",
  },
  {
    category: "Lifestyle",
    variant_name: "Downtown Stroll",
    action: "Athlete walks through a vibrant downtown area, window shopping and interacting with fans",
    location: "College town main street with restaurants and shops",
    wardrobe: "Streetwear — oversized graphic tee, cargo pants, chain necklace",
    lighting: "Neon sign reflections and warm streetlights at twilight",
    camera_angle: "Handheld vlog-style following at shoulder level",
    audio_track: "Chill boom-bap beat",
    content_tier: "social",
    platforms: "TikTok, Instagram Reels",
  },

  // ── Portrait (5) ──────────────────────────────────────────────────────
  {
    category: "Portrait",
    variant_name: "Hero Shot",
    action: "Athlete stands arms crossed, looking directly into camera with intense focus",
    location: "Empty stadium with seats stretching into the background",
    wardrobe: "Full game-day uniform, clean and pressed",
    lighting: "Single dramatic key light from the left, dark background",
    camera_angle: "Slow push-in from waist-up to tight headshot",
    audio_track: null,
    content_tier: "premium",
    platforms: "Instagram, Twitter/X",
  },
  {
    category: "Portrait",
    variant_name: "Smoke and Light",
    action: "Athlete poses in a studio with colored smoke and volumetric lighting",
    location: "Blacked-out photo studio with haze machine",
    wardrobe: "Minimalist athletic wear — sports bra or tank, compression shorts",
    lighting: "Colored gel lights (blue and orange) with haze for volume",
    camera_angle: "Rotating orbit shot at chest height",
    audio_track: "Dark cinematic synth pad",
    content_tier: "premium",
    platforms: "Instagram",
  },
  {
    category: "Portrait",
    variant_name: "Outdoor Natural",
    action: "Athlete leans against a concrete wall, relaxed confident expression, slight smile",
    location: "Urban exterior with textured concrete or brick wall",
    wardrobe: "Casual team merchandise — branded cap, hoodie",
    lighting: "Open shade with natural reflector bounce",
    camera_angle: "Medium portrait at 85mm equivalent, shallow depth of field",
    audio_track: null,
    content_tier: "standard",
    platforms: "Instagram, LinkedIn",
  },
  {
    category: "Portrait",
    variant_name: "Silhouette Power",
    action: "Athlete holds a ball overhead in a strong silhouette pose against a sunset sky",
    location: "Rooftop or hilltop overlooking the campus at sunset",
    wardrobe: "Athletic silhouette — shorts and jersey outline visible",
    lighting: "Full backlight from setting sun, no fill",
    camera_angle: "Low angle wide shot emphasizing the figure against the sky",
    audio_track: "Cinematic strings swell",
    content_tier: "premium",
    platforms: "Instagram, Twitter/X",
  },
  {
    category: "Portrait",
    variant_name: "Headshot Clean",
    action: "Athlete gives a professional headshot expression — neutral to slight smile",
    location: "Studio with seamless gray backdrop",
    wardrobe: "Team blazer or polo, neatly styled",
    lighting: "Classic three-point portrait lighting with soft key",
    camera_angle: "Static head-and-shoulders frame at eye level",
    audio_track: null,
    content_tier: "standard",
    platforms: "LinkedIn, Team Website",
  },

  // ── Celebration (5) ───────────────────────────────────────────────────
  {
    category: "Celebration",
    variant_name: "Touchdown Dance",
    action: "Athlete scores and breaks into a signature celebration dance in the end zone",
    location: "Stadium end zone with painted logo and cheering crowd",
    wardrobe: "Full game uniform, slightly disheveled from play",
    lighting: "Bright stadium lights with confetti particles in the air",
    camera_angle: "Wide shot pulling to slow-motion medium on the celebration",
    audio_track: "Hype crowd chant with bass-heavy beat",
    content_tier: "premium",
    platforms: "TikTok, Instagram Reels, YouTube Shorts",
  },
  {
    category: "Celebration",
    variant_name: "Championship Trophy",
    action: "Athlete lifts a championship trophy overhead while teammates cheer around them",
    location: "Center court or midfield with confetti falling",
    wardrobe: "Game uniform with championship cap and net draped on shoulders",
    lighting: "Spotlight on the athlete with flash photography pops",
    camera_angle: "Dramatic low-angle hero shot with slow-motion confetti",
    audio_track: "Triumphant orchestral fanfare",
    content_tier: "premium",
    platforms: "Instagram, Twitter/X, YouTube",
  },
  {
    category: "Celebration",
    variant_name: "Teammates Mob",
    action: "Teammates rush and pile onto the athlete after a game-winning play",
    location: "Playing field or court with scoreboard showing the win",
    wardrobe: "Full game uniforms",
    lighting: "Stadium lights with evening sky backdrop",
    camera_angle: "Handheld chaos shot transitioning to slow-motion overhead drone",
    audio_track: "Crowd roar fading into emotional piano",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok",
  },
  {
    category: "Celebration",
    variant_name: "Post-Game Interview",
    action: "Athlete speaks into sideline microphone, smiling and breathing hard after the win",
    location: "Sideline interview area with team backdrop banner",
    wardrobe: "Game uniform, towel over shoulders, sweat visible",
    lighting: "Bright broadcast interview lights",
    camera_angle: "Standard TV interview frame, medium shot",
    audio_track: null,
    content_tier: "standard",
    platforms: "Twitter/X, Instagram Stories",
  },
  {
    category: "Celebration",
    variant_name: "Fan High-Fives",
    action: "Athlete runs along the front row giving high-fives to fans reaching over the railing",
    location: "Stadium front row with packed enthusiastic fans",
    wardrobe: "Game uniform with rally towel",
    lighting: "Stadium lights with fan phone flashlights creating sparkle",
    camera_angle: "Tracking alongside at athlete speed, fan faces in background",
    audio_track: "Upbeat pop-rock anthem",
    content_tier: "standard",
    platforms: "TikTok, Instagram Reels",
  },

  // ── Behind the Scenes (4) ────────────────────────────────────────────
  {
    category: "Behind the Scenes",
    variant_name: "Film Room Review",
    action: "Athlete studies game film on a large screen, pointing out plays and taking notes",
    location: "Team film room with tiered seating and projection screen",
    wardrobe: "Team-issued casual — polo and khakis or joggers",
    lighting: "Dim room lit primarily by the projection screen glow",
    camera_angle: "Over-the-shoulder shot showing the screen and athlete's focus",
    audio_track: "Subtle ambient tech soundtrack",
    content_tier: "standard",
    platforms: "Instagram, YouTube",
  },
  {
    category: "Behind the Scenes",
    variant_name: "Equipment Room",
    action: "Athlete walks through the equipment room, running hands over jerseys and gear",
    location: "Team equipment room with racks of jerseys and helmets",
    wardrobe: "Practice gear — shorts and team tee",
    lighting: "Fluorescent overhead with warm accent on jersey racks",
    camera_angle: "Slow tracking shot following from behind through narrow aisles",
    audio_track: "Nostalgic lo-fi beat",
    content_tier: "standard",
    platforms: "Instagram Reels, TikTok",
  },
  {
    category: "Behind the Scenes",
    variant_name: "Ice Bath Recovery",
    action: "Athlete steps into an ice bath, reacts to the cold, then settles in with composure",
    location: "Athletic training room with steel tubs and sports medicine posters",
    wardrobe: "Compression shorts, no shirt",
    lighting: "Clean clinical lighting with slight blue tone",
    camera_angle: "Medium shot capturing facial expression then widening to full scene",
    audio_track: "Ambient chill electronic",
    content_tier: "social",
    platforms: "TikTok, Instagram Reels",
  },
  {
    category: "Behind the Scenes",
    variant_name: "Team Bus",
    action: "Athlete on the team bus with headphones, looking out the window as scenery passes",
    location: "Charter bus interior with tinted windows and leather seats",
    wardrobe: "Travel day outfit — team tracksuit, neck pillow",
    lighting: "Natural passing light through tinted windows, moody blue tones",
    camera_angle: "Close-up profile with window reflections, shallow depth of field",
    audio_track: "Mellow downtempo beat",
    content_tier: "social",
    platforms: "Instagram Stories, TikTok",
  },

  // ── Brand / Endorsement (5) ───────────────────────────────────────────
  {
    category: "Brand",
    variant_name: "Sneaker Unboxing",
    action: "Athlete unboxes a fresh pair of branded sneakers, examining and trying them on",
    location: "Clean minimalist table setup with branded shipping box",
    wardrobe: "Casual streetwear, focus on the shoes",
    lighting: "Bright product-style key light with soft fill, white bounce",
    camera_angle: "Top-down hands-and-product shot transitioning to foot-level reveal",
    audio_track: "Satisfying ASMR-style effects with light beat",
    content_tier: "social",
    platforms: "TikTok, Instagram Reels, YouTube Shorts",
  },
  {
    category: "Brand",
    variant_name: "Supplement Stack",
    action: "Athlete shows their daily supplement routine — shaking a protein shake and drinking",
    location: "Kitchen counter or gym smoothie bar",
    wardrobe: "Brand-partner tank top or tee",
    lighting: "Bright, clean, commercial-grade even lighting",
    camera_angle: "Quick-cut product close-ups mixed with athlete medium shots",
    audio_track: "Energetic pop-electronic track",
    content_tier: "social",
    platforms: "TikTok, Instagram Reels",
  },
  {
    category: "Brand",
    variant_name: "Apparel Showcase",
    action: "Athlete models a new apparel line with confident poses and outfit transitions",
    location: "Urban rooftop with city skyline in the background",
    wardrobe: "Multiple outfits from the brand partner collection",
    lighting: "Magic hour with golden rim light and city ambient fill",
    camera_angle: "Fashion-style walk-toward-camera with slow-motion cuts",
    audio_track: "Trendy pop beat",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok",
  },
  {
    category: "Brand",
    variant_name: "Tech Product Demo",
    action: "Athlete demonstrates using a tech product (headphones, watch, app) during workout",
    location: "Modern gym or training facility",
    wardrobe: "Clean workout outfit complementing the product",
    lighting: "Bright gym lights with product-highlight accent lighting",
    camera_angle: "Close-up product insert shots intercut with workout footage",
    audio_track: "Tech-inspired electronic beat",
    content_tier: "standard",
    platforms: "YouTube Shorts, Instagram Reels",
  },
  {
    category: "Brand",
    variant_name: "Car Partner Feature",
    action: "Athlete approaches and gets into a branded vehicle, starts it, and drives off",
    location: "Scenic overlook or upscale parking structure",
    wardrobe: "Smart casual — button-down, clean sneakers",
    lighting: "Cinematic blue-hour ambient with car interior accent lights",
    camera_angle: "Wide exterior establishing shot cutting to interior close-ups",
    audio_track: "Smooth R&B with bass",
    content_tier: "premium",
    platforms: "Instagram Reels, YouTube",
  },

  // ── Motivational (5) ──────────────────────────────────────────────────
  {
    category: "Motivational",
    variant_name: "Voiceover Grind",
    action: "Montage of athlete training hard — lifting, running, stretching — with voiceover narration",
    location: "Multiple locations — gym, field, track, locker room",
    wardrobe: "Various training outfits across scenes",
    lighting: "Mixed — dramatic gym lights, golden outdoor, moody locker room",
    camera_angle: "Quick-cut montage with slow-motion hero moments",
    audio_track: "Motivational speech over dark cinematic beat",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok, YouTube Shorts",
  },
  {
    category: "Motivational",
    variant_name: "Empty Gym Midnight",
    action: "Athlete trains alone in an empty gym late at night, pushing through exhaustion",
    location: "Dimly lit gym after hours with EXIT signs glowing",
    wardrobe: "Well-worn training gear, sweat-soaked",
    lighting: "Single overhead light creating a pool of light in darkness",
    camera_angle: "Wide establishing the emptiness, then tight on effort and sweat",
    audio_track: "Slow atmospheric beat building to crescendo",
    content_tier: "premium",
    platforms: "Instagram Reels, TikTok",
  },
  {
    category: "Motivational",
    variant_name: "Comeback Story",
    action: "Athlete is shown in rehab, then progressively training harder, ending with game action",
    location: "Medical facility transitioning to gym then to game field",
    wardrobe: "Medical brace / rehab wear transitioning to full game uniform",
    lighting: "Cool clinical tones warming to bright stadium lights",
    camera_angle: "Time-lapse style progression with match-cut transitions",
    audio_track: "Emotional piano building to triumphant orchestral",
    content_tier: "premium",
    platforms: "Instagram Reels, YouTube",
  },
  {
    category: "Motivational",
    variant_name: "Mirror Talk",
    action: "Athlete stares into a locker room mirror, psyching themselves up before a big game",
    location: "Locker room with mirror and dim atmospheric lighting",
    wardrobe: "Game jersey on, final preparations",
    lighting: "Mirror-reflected key light with dark surroundings",
    camera_angle: "Over-shoulder into mirror, slowly tightening to eyes in reflection",
    audio_track: "Heartbeat rhythm with rising tension",
    content_tier: "standard",
    platforms: "TikTok, Instagram Reels",
  },
  {
    category: "Motivational",
    variant_name: "Sunrise Commitment",
    action: "Athlete is the first one at the facility, arriving in darkness and beginning training at dawn",
    location: "Athletic facility exterior then interior, pre-dawn to sunrise",
    wardrobe: "Layers for cold morning — beanie, hoodie, gloves removed as workout heats up",
    lighting: "Pre-dawn blue transitioning to warm golden sunrise through facility windows",
    camera_angle: "Time-lapse exterior then handheld intimate interior shots",
    audio_track: "Ambient build to uplifting acoustic guitar",
    content_tier: "standard",
    platforms: "Instagram Reels, YouTube Shorts",
  },

  // ── Social Media Native (4) ──────────────────────────────────────────
  {
    category: "Social Media",
    variant_name: "Get Ready With Me",
    action: "Athlete shows game-day preparation — outfit selection, grooming, accessorizing",
    location: "Apartment bedroom and bathroom, well-decorated",
    wardrobe: "Transition from casual to game-day sharp look",
    lighting: "Bright vanity mirror lighting mixed with natural window light",
    camera_angle: "Front-facing vlog style, phone propped on counter",
    audio_track: "Trending TikTok audio",
    content_tier: "social",
    platforms: "TikTok, Instagram Reels",
  },
  {
    category: "Social Media",
    variant_name: "Day in the Life",
    action: "Full day documented — morning routine, classes, practice, dinner, study, sleep",
    location: "Multiple campus locations throughout the day",
    wardrobe: "Changes throughout the day to match activities",
    lighting: "Natural progression from morning to night",
    camera_angle: "Vlog-style POV mixed with tripod time-lapses",
    audio_track: "Chill beat playlist mix",
    content_tier: "social",
    platforms: "TikTok, YouTube Shorts",
  },
  {
    category: "Social Media",
    variant_name: "Challenge Video",
    action: "Athlete attempts a viral sports challenge — trick shot, balance test, or strength feat",
    location: "Gym, field, or dorm room depending on the challenge",
    wardrobe: "Casual athletic wear",
    lighting: "Whatever is available — natural and authentic feel",
    camera_angle: "Single static wide shot capturing the full attempt, reaction included",
    audio_track: "Viral challenge audio trend",
    content_tier: "social",
    platforms: "TikTok",
  },
  {
    category: "Social Media",
    variant_name: "Q&A Storytime",
    action: "Athlete sits and answers fan questions with animated storytelling and reactions",
    location: "Cozy dorm or apartment setup with fairy lights or LED backdrop",
    wardrobe: "Relaxed casual — oversized tee, shorts, slippers",
    lighting: "Ring light as key with ambient colored LEDs in background",
    camera_angle: "Classic talking-head frame, slightly above eye level",
    audio_track: null,
    content_tier: "social",
    platforms: "TikTok, YouTube Shorts",
  },

  // ── Cinematic (4) ─────────────────────────────────────────────────────
  {
    category: "Cinematic",
    variant_name: "Rainy Night Training",
    action: "Athlete trains on a rain-soaked field at night, water splashing with every step",
    location: "Outdoor field during heavy rain, lit by stadium lights",
    wardrobe: "Soaked training gear clinging to skin",
    lighting: "Backlit rain with bright stadium floods creating visible rain streaks",
    camera_angle: "Slow-motion low angle capturing splashes and determination",
    audio_track: "Cinematic Hans Zimmer-style orchestral",
    content_tier: "premium",
    platforms: "Instagram Reels, YouTube",
  },
  {
    category: "Cinematic",
    variant_name: "Stadium Aerial",
    action: "Athlete stands alone at center field while drone pulls up to reveal the full empty stadium",
    location: "Large empty college stadium during golden hour",
    wardrobe: "Team uniform, standing tall",
    lighting: "Golden hour with long shadows and warm stadium concrete tones",
    camera_angle: "Starting tight on athlete, drone ascends to full stadium reveal",
    audio_track: "Sweeping orchestral with building strings",
    content_tier: "premium",
    platforms: "Instagram Reels, YouTube",
  },
  {
    category: "Cinematic",
    variant_name: "Black and White Grit",
    action: "Athlete performs intense workout in black and white with only team color accented",
    location: "Gritty old-school gym with exposed brick and iron weights",
    wardrobe: "Minimalist — tank top and shorts in team accent color",
    lighting: "High-contrast hard lighting from a single source",
    camera_angle: "Dramatic close-ups of muscles, chalk, sweat — intercut with wide shots",
    audio_track: "Raw boom-bap hip-hop instrumental",
    content_tier: "premium",
    platforms: "Instagram Reels",
  },
  {
    category: "Cinematic",
    variant_name: "Drone Chase",
    action: "Athlete sprints across an open field while a drone chases close behind at high speed",
    location: "Wide open athletic field or rural landscape near campus",
    wardrobe: "Streamlined speed gear — compression fit, racing flats",
    lighting: "Bright midday sun with high contrast and sharp shadows",
    camera_angle: "FPV drone chase from behind, swooping and banking with the athlete",
    audio_track: "Adrenaline-pumping electronic EDM track",
    content_tier: "premium",
    platforms: "TikTok, Instagram Reels, YouTube Shorts",
  },
];

async function seed(): Promise<void> {
  console.log(`Seeding ${templates.length} templates into Supabase…`);

  const { count: existingCount } = await supabase
    .from("templates")
    .select("*", { count: "exact", head: true });

  if (existingCount && existingCount > 0) {
    console.log(`Found ${existingCount} existing templates. Clearing before re-seeding…`);
    const { error: deleteError } = await supabase
      .from("templates")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) {
      console.error("Failed to clear existing templates:", deleteError.message);
      process.exit(1);
    }
  }

  const { data, error } = await supabase
    .from("templates")
    .insert(templates)
    .select("id, category, variant_name");

  if (error) {
    console.error("Supabase error:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data?.length ?? 0} templates.`);

  if (data && data.length > 0) {
    const categories = new Map<string, number>();
    for (const row of data) {
      categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
    }
    console.log("\nBreakdown by category:");
    for (const [cat, count] of [...categories.entries()].sort()) {
      console.log(`  ${cat}: ${count}`);
    }
  }
}

seed().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
