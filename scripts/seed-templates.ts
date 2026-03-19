import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface TemplateInsert {
  category: string;
  variant_name: string;
  action: string;
  location: string;
  wardrobe: string;
  lighting: string;
  camera_angle: string;
  audio_track: string;
  content_tier: "premium" | "standard" | "social";
  platforms: string[];
}

// 15 categories × 3 variants = 45 templates
// Premium tier (Runway Gen-4.5): Luxury Travel, Fine Dining, Wellness, Motorsports, Yacht, Business
// Standard tier (Kling 3.0): Outdoor Adventure, Urban Nightlife, Fitness, Beach, Fashion, Studio Portrait, Game Day, Charity, Music

const templates: TemplateInsert[] = [
  // ─── LUXURY TRAVEL (Premium) ─────────────────────────────
  {
    category: "Luxury Travel",
    variant_name: "Private Jet Arrival",
    action: "stepping off a private jet with confidence",
    location: "Private airport tarmac at sunset",
    wardrobe: "Tailored navy suit with aviator sunglasses",
    lighting: "Golden hour backlighting with lens flare",
    camera_angle: "Low angle tracking shot, 24mm wide",
    audio_track: "Cinematic orchestral swell",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube", "TikTok"],
  },
  {
    category: "Luxury Travel",
    variant_name: "Penthouse View",
    action: "gazing out from a luxury penthouse balcony overlooking the city",
    location: "High-rise penthouse balcony, Dubai skyline",
    wardrobe: "Silk robe and designer loafers",
    lighting: "Twilight city glow with warm interior backlight",
    camera_angle: "Over-the-shoulder medium shot, 50mm",
    audio_track: "Ambient lounge electronic",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Luxury Travel",
    variant_name: "Resort Poolside",
    action: "walking along an infinity pool at a tropical resort",
    location: "Maldives overwater villa infinity pool",
    wardrobe: "Designer swim shorts with luxury watch",
    lighting: "Bright tropical midday sun with water reflections",
    camera_angle: "Drone descending aerial shot, wide angle",
    audio_track: "Tropical house beat",
    content_tier: "premium",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── FINE DINING (Premium) ───────────────────────────────
  {
    category: "Fine Dining",
    variant_name: "Michelin Experience",
    action: "savoring a dish at a Michelin-star restaurant",
    location: "Intimate fine dining restaurant with candlelight",
    wardrobe: "Black turtleneck and tailored blazer",
    lighting: "Warm candlelight with soft overhead spots",
    camera_angle: "Close-up table level, 85mm portrait lens",
    audio_track: "Jazz piano trio ambient",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Fine Dining",
    variant_name: "Wine Cellar Toast",
    action: "raising a glass of rare wine in a private cellar",
    location: "Stone-walled underground wine cellar",
    wardrobe: "Cashmere sweater and dress slacks",
    lighting: "Warm tungsten wall sconces with deep shadows",
    camera_angle: "Medium shot, slightly low angle, 35mm",
    audio_track: "Sophisticated acoustic guitar",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Fine Dining",
    variant_name: "Chef's Table",
    action: "sitting at an exclusive chef's table watching dishes being prepared",
    location: "Open kitchen chef's counter, Japanese omakase",
    wardrobe: "Linen shirt with rolled sleeves, luxury watch",
    lighting: "Clean overhead task lighting with warm tones",
    camera_angle: "Side profile medium shot, 50mm",
    audio_track: "Minimal ambient with kitchen sounds",
    content_tier: "premium",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── WELLNESS & MINDFULNESS (Premium) ────────────────────
  {
    category: "Wellness & Mindfulness",
    variant_name: "Mountain Meditation",
    action: "meditating at sunrise on a mountain peak",
    location: "Mountain summit at dawn, above the clouds",
    wardrobe: "Premium athleisure in earth tones",
    lighting: "Pre-dawn pink to golden sunrise transition",
    camera_angle: "Wide establishing shot pulling back, 16mm",
    audio_track: "Tibetan singing bowls ambient",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube", "TikTok"],
  },
  {
    category: "Wellness & Mindfulness",
    variant_name: "Spa Ritual",
    action: "emerging from a luxury spa plunge pool",
    location: "Japanese-inspired luxury spa with hot springs",
    wardrobe: "White spa robe, minimal jewelry",
    lighting: "Soft diffused natural light through steam",
    camera_angle: "Slow motion medium shot, 50mm",
    audio_track: "Nature sounds with gentle flute",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Wellness & Mindfulness",
    variant_name: "Yoga at Sunset",
    action: "performing yoga poses on a cliff overlooking the ocean",
    location: "Seaside cliff yoga platform at golden hour",
    wardrobe: "Designer yoga apparel in muted tones",
    lighting: "Warm golden backlight with ocean reflections",
    camera_angle: "Tracking dolly shot, 35mm",
    audio_track: "Ambient nature soundscape",
    content_tier: "premium",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── MOTORSPORTS & CARS (Premium) ────────────────────────
  {
    category: "Motorsports & Cars",
    variant_name: "Supercar Reveal",
    action: "stepping out of a Lamborghini in slow motion",
    location: "Underground luxury car garage with LED accents",
    wardrobe: "Racing-inspired luxury jacket and boots",
    lighting: "Dramatic LED strip lighting with fog",
    camera_angle: "Low angle hero shot, 24mm with lens flare",
    audio_track: "Deep bass engine rev with electronic beat",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube", "TikTok"],
  },
  {
    category: "Motorsports & Cars",
    variant_name: "Track Day",
    action: "driving a supercar on a professional racing circuit",
    location: "Professional F1-style race track",
    wardrobe: "Custom racing suit with team branding",
    lighting: "Bright daylight with heat shimmer effects",
    camera_angle: "In-car camera alternating with trackside 200mm telephoto",
    audio_track: "High energy electronic with engine sounds",
    content_tier: "premium",
    platforms: ["YouTube", "Instagram"],
  },
  {
    category: "Motorsports & Cars",
    variant_name: "Night Cruise",
    action: "cruising through city streets at night in a luxury convertible",
    location: "Downtown city boulevard with neon signs",
    wardrobe: "Leather jacket with designer sunglasses",
    lighting: "Neon city reflections with dashboard glow",
    camera_angle: "Rolling tracking shot alongside car, 35mm",
    audio_track: "Synthwave retro electronic",
    content_tier: "premium",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── YACHT & WATER (Premium) ─────────────────────────────
  {
    category: "Yacht & Water",
    variant_name: "Mega Yacht Deck",
    action: "standing at the bow of a mega yacht with arms crossed",
    location: "Mediterranean mega yacht deck, open sea",
    wardrobe: "White linen shirt unbuttoned, navy shorts",
    lighting: "Bright Mediterranean sun with ocean sparkle",
    camera_angle: "Drone circling aerial shot descending",
    audio_track: "Deep house with ocean wave samples",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube", "TikTok"],
  },
  {
    category: "Yacht & Water",
    variant_name: "Jet Ski Action",
    action: "riding a jet ski at high speed creating a massive wake",
    location: "Crystal clear tropical waters near yacht",
    wardrobe: "Designer wetsuit top, board shorts",
    lighting: "Overhead tropical sun with water spray prisms",
    camera_angle: "GoPro front-facing with splash effects",
    audio_track: "Upbeat tropical EDM",
    content_tier: "premium",
    platforms: ["Instagram", "TikTok"],
  },
  {
    category: "Yacht & Water",
    variant_name: "Sunset Sail",
    action: "relaxing on a sailing yacht deck during golden hour",
    location: "Sailing yacht deck in Greek islands",
    wardrobe: "Casual linen outfit with boat shoes",
    lighting: "Warm golden hour with sail shadows",
    camera_angle: "Medium wide shot with sail framing, 35mm",
    audio_track: "Acoustic guitar with gentle waves",
    content_tier: "premium",
    platforms: ["Instagram", "YouTube"],
  },

  // ─── BUSINESS & LEADERSHIP (Premium) ─────────────────────
  {
    category: "Business & Leadership",
    variant_name: "Boardroom Power",
    action: "commanding attention in a glass-walled boardroom",
    location: "Corner office boardroom, 50th floor skyline view",
    wardrobe: "Custom-tailored three-piece suit",
    lighting: "Clean corporate daylight with city backdrop",
    camera_angle: "Low angle power shot, 35mm through glass table",
    audio_track: "Inspirational corporate strings",
    content_tier: "premium",
    platforms: ["LinkedIn", "Instagram", "YouTube"],
  },
  {
    category: "Business & Leadership",
    variant_name: "Keynote Stage",
    action: "delivering a keynote speech to a packed audience",
    location: "Modern conference stage with LED screens",
    wardrobe: "Smart casual blazer with sneakers",
    lighting: "Dramatic stage lighting with audience silhouettes",
    camera_angle: "Sweeping crane shot from audience to stage",
    audio_track: "Building motivational score",
    content_tier: "premium",
    platforms: ["LinkedIn", "YouTube"],
  },
  {
    category: "Business & Leadership",
    variant_name: "Office Walk",
    action: "walking through a modern office receiving greetings from the team",
    location: "Silicon Valley-style open office campus",
    wardrobe: "Elevated casual — premium polo and chinos",
    lighting: "Natural window light in modern open office",
    camera_angle: "Steadicam follow shot, 24mm tracking behind",
    audio_track: "Upbeat indie corporate",
    content_tier: "premium",
    platforms: ["LinkedIn", "Instagram"],
  },

  // ─── OUTDOOR ADVENTURE (Standard) ────────────────────────
  {
    category: "Outdoor Adventure",
    variant_name: "Summit Triumph",
    action: "planting a flag at the top of a mountain summit",
    location: "Snow-capped mountain peak, clear sky",
    wardrobe: "Technical mountaineering gear with brand logos",
    lighting: "Crisp alpine daylight with snow reflections",
    camera_angle: "Wide angle hero shot from below, 16mm",
    audio_track: "Epic orchestral victory theme",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube", "TikTok"],
  },
  {
    category: "Outdoor Adventure",
    variant_name: "Jungle Trek",
    action: "navigating through a dense tropical rainforest",
    location: "Costa Rica jungle trail with waterfalls",
    wardrobe: "Technical hiking gear with adventure watch",
    lighting: "Dappled sunlight through jungle canopy",
    camera_angle: "POV interspersed with wide trail shots",
    audio_track: "Tribal drums with nature sounds",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Outdoor Adventure",
    variant_name: "Desert Explorer",
    action: "riding an ATV across vast sand dunes",
    location: "Sahara Desert golden sand dunes",
    wardrobe: "Desert tactical wear with head wrap",
    lighting: "Harsh desert sun with long shadows",
    camera_angle: "Drone chase shot from behind, dynamic",
    audio_track: "Arabian-inspired electronic fusion",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── URBAN NIGHTLIFE (Standard) ──────────────────────────
  {
    category: "Urban Nightlife",
    variant_name: "VIP Entrance",
    action: "walking past velvet ropes into an exclusive nightclub",
    location: "High-end nightclub entrance, downtown Manhattan",
    wardrobe: "All-black designer outfit with chain accessories",
    lighting: "Neon club lights with purple and blue haze",
    camera_angle: "Slow motion tracking shot, 35mm",
    audio_track: "Deep house bass drop build-up",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },
  {
    category: "Urban Nightlife",
    variant_name: "Rooftop Party",
    action: "raising a toast at a rooftop party with city skyline",
    location: "NYC rooftop lounge with skyline panorama",
    wardrobe: "Smart casual with designer sneakers",
    lighting: "City lights bokeh with warm string lights",
    camera_angle: "Dolly-in close-up to wide reveal, 24-70mm",
    audio_track: "Afrobeats lounge mix",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },
  {
    category: "Urban Nightlife",
    variant_name: "Late Night Drive",
    action: "leaning against a sports car under city lights",
    location: "Rain-slicked downtown street at 2 AM",
    wardrobe: "Oversized streetwear with reflective elements",
    lighting: "Wet street neon reflections with fog",
    camera_angle: "Cinematic wide shot, anamorphic 40mm",
    audio_track: "Lo-fi hip hop with rain ambience",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── FITNESS & TRAINING (Standard) ───────────────────────
  {
    category: "Fitness & Training",
    variant_name: "Iron Temple",
    action: "performing a heavy deadlift with intense focus",
    location: "Industrial gym with exposed brick and chains",
    wardrobe: "Performance compression wear with training belt",
    lighting: "Dramatic overhead spots with rim lighting",
    camera_angle: "Low angle close-up on lift, 35mm",
    audio_track: "Heavy trap beat with bass drops",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },
  {
    category: "Fitness & Training",
    variant_name: "Sprint Power",
    action: "explosive sprint start from blocks in slow motion",
    location: "Olympic-standard running track at dawn",
    wardrobe: "Sprint spikes and form-fitting track gear",
    lighting: "Dawn side-lighting emphasizing muscle definition",
    camera_angle: "Super slow motion side tracking, 200mm",
    audio_track: "Heartbeat transitioning to explosive beat",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Fitness & Training",
    variant_name: "Boxing Ring",
    action: "shadow boxing in a ring with hands wrapped",
    location: "Classic boxing gym with worn leather bags",
    wardrobe: "Boxing shorts, wraps, and no shirt",
    lighting: "Single harsh overhead ring light with shadows",
    camera_angle: "Circular tracking shot around ring, 50mm",
    audio_track: "Raw hip hop instrumental",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── BEACH & RESORT (Standard) ───────────────────────────
  {
    category: "Beach & Resort",
    variant_name: "Shore Walk",
    action: "walking along the shoreline at sunset with waves at feet",
    location: "Pristine white sand beach, Bali",
    wardrobe: "Linen pants rolled up, open shirt",
    lighting: "Orange and pink sunset with wet sand reflections",
    camera_angle: "Wide tracking shot along shore, 24mm",
    audio_track: "Chill acoustic with wave sounds",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },
  {
    category: "Beach & Resort",
    variant_name: "Surf Session",
    action: "catching a perfect wave and riding it to shore",
    location: "Pipeline-style surf break, Hawaii",
    wardrobe: "Brand-sponsored wetsuit or board shorts",
    lighting: "Backlit wave with golden spray",
    camera_angle: "Water-level tracking shot, waterhoused camera",
    audio_track: "Reggae-infused surf rock",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube", "TikTok"],
  },
  {
    category: "Beach & Resort",
    variant_name: "Cabana Vibes",
    action: "relaxing in a luxury beach cabana with a cocktail",
    location: "Five-star resort private beach cabana",
    wardrobe: "Resort wear with designer sunglasses",
    lighting: "Filtered tropical sunlight through cabana drapes",
    camera_angle: "Slow dolly-in through sheer curtains, 50mm",
    audio_track: "Tropical deep house",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },

  // ─── FASHION & STREETWEAR (Standard) ─────────────────────
  {
    category: "Fashion & Streetwear",
    variant_name: "Urban Runway",
    action: "strutting down a graffiti-lined alley like a runway",
    location: "Brooklyn street art alley",
    wardrobe: "Limited edition sneakers, oversized designer hoodie",
    lighting: "Overcast natural light with neon accent",
    camera_angle: "Slow-mo front tracking shot, 85mm",
    audio_track: "Trap beat with vinyl scratch elements",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },
  {
    category: "Fashion & Streetwear",
    variant_name: "Sneaker Drop",
    action: "unboxing and lacing up exclusive sneakers",
    location: "Clean minimalist studio with product display",
    wardrobe: "Streetwear matching the sneaker colorway",
    lighting: "Bright studio lighting with colored gel accents",
    camera_angle: "Macro close-up details to full outfit reveal",
    audio_track: "Lo-fi beats with satisfying ASMR elements",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },
  {
    category: "Fashion & Streetwear",
    variant_name: "Lookbook Walk",
    action: "multi-outfit showcase walking through different urban settings",
    location: "Downtown city transitions — café, bridge, mural wall",
    wardrobe: "Three outfit changes — casual, smart, street",
    lighting: "Mixed natural and urban lighting per location",
    camera_angle: "Quick-cut transitions with match movement, 35mm",
    audio_track: "Upbeat hip hop instrumental",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },

  // ─── STUDIO PORTRAIT (Standard) ──────────────────────────
  {
    category: "Studio Portrait",
    variant_name: "Editorial Close-Up",
    action: "intense eye-contact portrait with subtle expression change",
    location: "Professional photo studio, seamless backdrop",
    wardrobe: "High-fashion editorial outfit, statement piece",
    lighting: "Rembrandt lighting with beauty dish key",
    camera_angle: "Tight close-up portrait, 85mm f/1.4",
    audio_track: "Minimal ambient drone",
    content_tier: "standard",
    platforms: ["Instagram", "LinkedIn"],
  },
  {
    category: "Studio Portrait",
    variant_name: "Dynamic Motion",
    action: "walking toward camera with fabric and wind effects",
    location: "Studio with wind machine and flowing fabric",
    wardrobe: "Flowing overcoat or cape with contrast layers",
    lighting: "Multiple strobes with dramatic shadows",
    camera_angle: "Slow motion front shot, 50mm",
    audio_track: "Cinematic piano with crescendo",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Studio Portrait",
    variant_name: "Athlete Identity",
    action: "posed portrait transitioning between athlete and business persona",
    location: "Split studio setup — gym side and office side",
    wardrobe: "Athletic gear morphing to business attire",
    lighting: "Split lighting — cool blue gym, warm amber office",
    camera_angle: "Locked-off center frame with morph transition",
    audio_track: "Dual-mood electronic crossfade",
    content_tier: "standard",
    platforms: ["Instagram", "LinkedIn", "YouTube"],
  },

  // ─── GAME DAY (Standard) ─────────────────────────────────
  {
    category: "Game Day",
    variant_name: "Tunnel Walk",
    action: "walking through the player tunnel toward the arena lights",
    location: "Stadium player tunnel with LED panels",
    wardrobe: "Full team uniform with warm-up gear",
    lighting: "Dark tunnel transitioning to bright stadium lights",
    camera_angle: "Low angle steadicam follow, 24mm",
    audio_track: "Crowd roar building with dramatic score",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },
  {
    category: "Game Day",
    variant_name: "Warm-Up Ritual",
    action: "performing pre-game warm-up routine with intensity",
    location: "Arena court or field, pre-game atmosphere",
    wardrobe: "Team warm-up suit with personal accessories",
    lighting: "Arena overhead lighting with scoreboard glow",
    camera_angle: "Mixed — close-up hands, wide action, slow-mo",
    audio_track: "Player's personal pump-up playlist style",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok"],
  },
  {
    category: "Game Day",
    variant_name: "Victory Celebration",
    action: "celebrating a big win with teammates in the locker room",
    location: "Team locker room with champagne and confetti",
    wardrobe: "Game jersey with championship gear",
    lighting: "Fluorescent locker room with flash photography",
    camera_angle: "Handheld documentary style, 24mm",
    audio_track: "Celebration hip hop anthem",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },

  // ─── CHARITY & COMMUNITY (Standard) ──────────────────────
  {
    category: "Charity & Community",
    variant_name: "Youth Camp",
    action: "coaching and high-fiving kids at a youth sports camp",
    location: "Community recreation center gymnasium",
    wardrobe: "Branded camp t-shirt with athletic shorts",
    lighting: "Bright indoor gym lighting, natural and warm",
    camera_angle: "Documentary-style handheld, 35mm",
    audio_track: "Uplifting indie acoustic",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube", "LinkedIn"],
  },
  {
    category: "Charity & Community",
    variant_name: "Giving Back",
    action: "serving meals and interacting with community members",
    location: "Community center or food bank",
    wardrobe: "Foundation branded polo with apron",
    lighting: "Warm natural window light, documentary feel",
    camera_angle: "Intimate medium shots with candid moments",
    audio_track: "Gentle piano with hopeful strings",
    content_tier: "standard",
    platforms: ["Instagram", "LinkedIn", "YouTube"],
  },
  {
    category: "Charity & Community",
    variant_name: "Hospital Visit",
    action: "visiting children in a hospital, signing autographs and giving gifts",
    location: "Children's hospital play room",
    wardrobe: "Smart casual with foundation pin",
    lighting: "Soft hospital lighting with window backlight",
    camera_angle: "Eye-level intimate shots, 50mm",
    audio_track: "Warm emotional piano",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube"],
  },

  // ─── MUSIC & ENTERTAINMENT (Standard) ────────────────────
  {
    category: "Music & Entertainment",
    variant_name: "Studio Session",
    action: "recording in a professional music studio with headphones on",
    location: "High-end recording studio with mixing board",
    wardrobe: "Streetwear with statement jewelry",
    lighting: "Moody colored LED ambient with console glow",
    camera_angle: "Through-the-glass booth shot, 50mm",
    audio_track: "Original beat showcase",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },
  {
    category: "Music & Entertainment",
    variant_name: "Red Carpet",
    action: "posing on a red carpet premiere with paparazzi flashes",
    location: "Movie premiere or awards show entrance",
    wardrobe: "Custom designer formal wear",
    lighting: "Paparazzi flash bursts with step-and-repeat backdrop",
    camera_angle: "Classic red carpet angle with slow pan, 70mm",
    audio_track: "Glamorous orchestral with camera shutter sounds",
    content_tier: "standard",
    platforms: ["Instagram", "YouTube"],
  },
  {
    category: "Music & Entertainment",
    variant_name: "Concert Stage",
    action: "performing or appearing on stage at a major concert",
    location: "Festival main stage with massive LED screen",
    wardrobe: "Concert-ready outfit with custom merch",
    lighting: "Full concert lighting rig — lasers, strobes, spots",
    camera_angle: "Dynamic multi-angle — crowd, stage, close-up",
    audio_track: "Live crowd energy with beat drop",
    content_tier: "standard",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },
];

async function seed() {
  console.log(`Seeding ${templates.length} templates...`);

  // Clear existing templates
  const { error: deleteError } = await supabase
    .from("templates")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.warn("Warning: Could not clear existing templates:", deleteError.message);
  }

  // Insert in batches
  const batchSize = 10;
  let inserted = 0;

  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("templates")
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += data.length;
      console.log(
        `  Batch ${Math.floor(i / batchSize) + 1}: inserted ${data.length} templates`
      );
    }
  }

  console.log(`\nDone! Inserted ${inserted}/${templates.length} templates.`);

  // Verify by category
  const { data: verify } = await supabase
    .from("templates")
    .select("category, content_tier");

  if (verify) {
    const categories = new Set(verify.map((t) => t.category));
    const premium = verify.filter((t) => t.content_tier === "premium").length;
    const standard = verify.filter((t) => t.content_tier === "standard").length;
    console.log(`\nVerification:`);
    console.log(`  Categories: ${categories.size}`);
    console.log(`  Premium templates: ${premium}`);
    console.log(`  Standard templates: ${standard}`);
    console.log(`  Total: ${verify.length}`);
  }
}

seed().catch(console.error);
