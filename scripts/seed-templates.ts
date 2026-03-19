import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { ContentTier } from "../lib/types";

config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type CategoryBase = {
  category: string;
  action: string;
  location: string;
  wardrobe: string;
  lighting: string;
  camera_angle: string;
  audio_track: string;
};

const premiumCategories = new Set([
  "Luxury Travel",
  "Fine Dining",
  "Wellness & Mindfulness",
  "Motorsports & Cars",
  "Yacht & Water",
  "Business & Leadership"
]);

const categories: CategoryBase[] = [
  {
    category: "Luxury Travel",
    action: "arriving with premium luggage and greeting concierge",
    location: "five-star resort entrance",
    wardrobe: "tailored travel set with minimalist accessories",
    lighting: "golden hour backlight",
    camera_angle: "wide cinematic dolly-in",
    audio_track: "orchestral lounge beat"
  },
  {
    category: "Fine Dining",
    action: "toasting and plating signature dish",
    location: "exclusive rooftop restaurant",
    wardrobe: "elevated evening attire",
    lighting: "soft practical candle glow",
    camera_angle: "slow slider medium close-up",
    audio_track: "modern jazz textures"
  },
  {
    category: "Wellness & Mindfulness",
    action: "guided breathing and recovery sequence",
    location: "tranquil spa courtyard",
    wardrobe: "neutral active recovery set",
    lighting: "diffused sunrise light",
    camera_angle: "steady gimbal side profile",
    audio_track: "ambient meditation pads"
  },
  {
    category: "Motorsports & Cars",
    action: "walking around performance vehicle before drive-off",
    location: "private track pit lane",
    wardrobe: "luxury motorsport capsule fit",
    lighting: "high contrast dusk highlights",
    camera_angle: "low-angle tracking shot",
    audio_track: "pulse-driven cinematic bass"
  },
  {
    category: "Yacht & Water",
    action: "boarding yacht and overlooking the horizon",
    location: "coastal marina dock",
    wardrobe: "white linen resort set",
    lighting: "sunlit ocean reflections",
    camera_angle: "drone reveal to medium hero frame",
    audio_track: "uplifting melodic house"
  },
  {
    category: "Business & Leadership",
    action: "presenting strategy board and leading team huddle",
    location: "glass executive suite",
    wardrobe: "modern business smart-casual",
    lighting: "clean daylight key with practical rim",
    camera_angle: "composed shoulder-level framing",
    audio_track: "motivational corporate synth"
  },
  {
    category: "Outdoor Adventure",
    action: "trail sprint and summit celebration",
    location: "mountain ridge trailhead",
    wardrobe: "performance outdoor kit",
    lighting: "natural overcast adventure look",
    camera_angle: "handheld action chase shot",
    audio_track: "percussive indie drive"
  },
  {
    category: "Urban Nightlife",
    action: "street walk with neon reflections",
    location: "downtown neon district",
    wardrobe: "dark monochrome street layer",
    lighting: "neon practical mixed color",
    camera_angle: "wide-angle walk-and-talk",
    audio_track: "electronic night pulse"
  },
  {
    category: "Fitness & Training",
    action: "high-intensity circuit with explosive finish",
    location: "elite performance gym floor",
    wardrobe: "team-branded compression set",
    lighting: "hard key sports contrast",
    camera_angle: "tight kinetic camera movement",
    audio_track: "high-energy trap sport beat"
  },
  {
    category: "Beach & Resort",
    action: "warmup jog along shoreline and cooldown stretch",
    location: "tropical beachfront resort",
    wardrobe: "lightweight resort activewear",
    lighting: "sunset edge light",
    camera_angle: "floating gimbal side tracking",
    audio_track: "chill tropical rhythm"
  },
  {
    category: "Fashion & Streetwear",
    action: "style walk and quick pose transitions",
    location: "graffiti-lined fashion block",
    wardrobe: "layered premium streetwear fit",
    lighting: "editorial hard flash accents",
    camera_angle: "editorial portrait-to-wide transitions",
    audio_track: "minimal drill rhythm"
  },
  {
    category: "Studio Portrait",
    action: "hero pose sequence with controlled movement",
    location: "cyclorama portrait studio",
    wardrobe: "signature brand palette wardrobe",
    lighting: "three-point clean portrait setup",
    camera_angle: "locked medium to close portrait lens",
    audio_track: "cinematic tension riser"
  },
  {
    category: "Game Day",
    action: "pre-game tunnel walk and hype moment",
    location: "stadium tunnel entrance",
    wardrobe: "official game-day kit",
    lighting: "dramatic tunnel practicals",
    camera_angle: "hero low-angle walkout",
    audio_track: "anthemic stadium beat"
  },
  {
    category: "Charity & Community",
    action: "community clinic coaching highlights",
    location: "local community center court",
    wardrobe: "foundation volunteer apparel",
    lighting: "natural documentary style light",
    camera_angle: "human-centered shoulder-level shots",
    audio_track: "uplifting acoustic groove"
  },
  {
    category: "Music & Entertainment",
    action: "backstage prep and stage entrance",
    location: "live show green room",
    wardrobe: "performance-ready statement pieces",
    lighting: "stage-inspired color accents",
    camera_angle: "dynamic whip-pan montage",
    audio_track: "festival crossover beat"
  }
];

const variants = [
  {
    variant_name: "Cinematic Hero",
    wardrobeModifier: "with premium detailing",
    lightingModifier: "with dramatic cinematic contrast",
    cameraModifier: "with smooth master framing",
    audio_track: "cinematic hybrid score",
    platforms: ["YouTube", "Instagram"]
  },
  {
    variant_name: "Editorial Motion",
    wardrobeModifier: "styled for editorial campaign visuals",
    lightingModifier: "with polished commercial highlights",
    cameraModifier: "with energetic editorial cuts",
    audio_track: "editorial rhythm bed",
    platforms: ["Instagram", "TikTok"]
  },
  {
    variant_name: "Social Sprint",
    wardrobeModifier: "optimized for social-first impact",
    lightingModifier: "with punchy social feed contrast",
    cameraModifier: "with short-form social framing",
    audio_track: "viral social tempo",
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"]
  }
];

function resolveTier(category: string, variantName: string): ContentTier {
  if (variantName === "Social Sprint") {
    return "social";
  }
  return premiumCategories.has(category) ? "premium" : "standard";
}

async function seedTemplates() {
  const templates = categories.flatMap((base) =>
    variants.map((variant) => ({
      category: base.category,
      variant_name: variant.variant_name,
      action: base.action,
      location: base.location,
      wardrobe: `${base.wardrobe} ${variant.wardrobeModifier}`,
      lighting: `${base.lighting} ${variant.lightingModifier}`,
      camera_angle: `${base.camera_angle} ${variant.cameraModifier}`,
      audio_track: variant.audio_track || base.audio_track,
      content_tier: resolveTier(base.category, variant.variant_name),
      platforms: variant.platforms
    }))
  );

  if (templates.length !== 45) {
    throw new Error(`Expected 45 templates, got ${templates.length}`);
  }

  const { error } = await supabase.from("templates").upsert(templates, {
    onConflict: "category,variant_name"
  });

  if (error) {
    throw error;
  }

  console.log(`Seeded ${templates.length} templates successfully.`);
}

seedTemplates().catch((error) => {
  console.error("Failed to seed templates:", error);
  process.exit(1);
});
