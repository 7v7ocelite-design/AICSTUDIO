import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

const SEED_TEMPLATES: Array<{
  category: string;
  variant_name: string;
  action: string;
  location: string;
  wardrobe: string;
  lighting: string;
  camera_angle: string;
  audio_track: string;
  content_tier: string;
  platforms: string;
}> = [
  { category:"Jet Arrival",variant_name:"V1",action:"Steps off private jet onto tarmac",location:"Luxury airport tarmac",wardrobe:"Designer travel outfit",lighting:"Golden hour backlight",camera_angle:"Wide tracking shot",audio_track:"jet_arrival_epic_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Jet Arrival",variant_name:"V2",action:"Walks down jet stairs with luggage",location:"Tropical airstrip",wardrobe:"Casual luxury streetwear",lighting:"Bright midday sun",camera_angle:"Low-angle hero shot",audio_track:"jet_arrival_epic_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Jet Arrival",variant_name:"V3",action:"Pauses at jet doorway looking back",location:"Night tarmac with runway lights",wardrobe:"All-black ensemble",lighting:"Dramatic rim lighting",camera_angle:"Medium cinematic shot",audio_track:"jet_arrival_epic_03",content_tier:"premium",platforms:"instagram,youtube" },
  { category:"Penthouse Lifestyle",variant_name:"V1",action:"Stands at floor-to-ceiling windows overlooking skyline",location:"Modern penthouse",wardrobe:"Tailored suit",lighting:"Warm interior ambient plus city glow",camera_angle:"Wide establishing shot",audio_track:"penthouse_chill_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Penthouse Lifestyle",variant_name:"V2",action:"Relaxes on rooftop terrace with drink",location:"Penthouse balcony",wardrobe:"Designer loungewear",lighting:"Sunset golden hour",camera_angle:"Medium over-shoulder shot",audio_track:"penthouse_chill_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Penthouse Lifestyle",variant_name:"V3",action:"Walks through minimalist penthouse interior",location:"Open-plan living space",wardrobe:"Smart casual",lighting:"Soft diffused natural light",camera_angle:"Steadicam tracking shot",audio_track:"penthouse_chill_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Luxury Car",variant_name:"V1",action:"Leans against matte black sports car",location:"Underground parking garage",wardrobe:"Streetwear with chain",lighting:"Moody overhead fluorescent",camera_angle:"Wide low-angle shot",audio_track:"luxury_car_drive_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Luxury Car",variant_name:"V2",action:"Steps out of luxury SUV",location:"Hotel valet entrance",wardrobe:"Business casual blazer",lighting:"Warm evening light",camera_angle:"Medium tracking shot",audio_track:"luxury_car_drive_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Luxury Car",variant_name:"V3",action:"Drives convertible on coastal highway",location:"Ocean cliff road",wardrobe:"Casual summer fit",lighting:"Bright natural sunlight",camera_angle:"Drone aerial follow shot",audio_track:"luxury_car_drive_03",content_tier:"premium",platforms:"instagram,youtube" },
  { category:"Red Carpet",variant_name:"V1",action:"Poses on red carpet with step-and-repeat backdrop",location:"Awards venue entrance",wardrobe:"Custom designer suit",lighting:"Flash photography lighting",camera_angle:"Front-facing medium shot",audio_track:"red_carpet_glam_01",content_tier:"premium",platforms:"instagram,youtube" },
  { category:"Red Carpet",variant_name:"V2",action:"Walks red carpet waving to crowd",location:"Premiere event",wardrobe:"Formal tuxedo",lighting:"Warm spotlights",camera_angle:"Side tracking shot",audio_track:"red_carpet_glam_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Red Carpet",variant_name:"V3",action:"Pauses for interview on carpet",location:"Media wall backdrop",wardrobe:"Tailored outfit with pocket square",lighting:"Broadcast lighting",camera_angle:"Medium close-up",audio_track:"red_carpet_glam_03",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Yacht Life",variant_name:"V1",action:"Stands at bow of yacht overlooking ocean",location:"Open water",wardrobe:"Swim trunks and open shirt",lighting:"Bright midday sun with water reflections",camera_angle:"Wide hero shot",audio_track:"yacht_life_wave_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Yacht Life",variant_name:"V2",action:"Relaxes on yacht deck with sunglasses",location:"Marina harbor",wardrobe:"Casual resort wear",lighting:"Golden hour side light",camera_angle:"Medium lifestyle shot",audio_track:"yacht_life_wave_02",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Yacht Life",variant_name:"V3",action:"Dives off yacht into turquoise water",location:"Tropical bay",wardrobe:"Swimwear",lighting:"Overhead bright sun",camera_angle:"Drone top-down shot",audio_track:"yacht_life_wave_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Rooftop Cityscape",variant_name:"V1",action:"Stands at rooftop edge overlooking downtown",location:"Skyscraper rooftop",wardrobe:"Streetwear hoodie",lighting:"Blue hour city lights",camera_angle:"Wide cinematic shot",audio_track:"rooftop_vibe_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Rooftop Cityscape",variant_name:"V2",action:"Sits on rooftop ledge with skyline behind",location:"Industrial rooftop",wardrobe:"Designer jacket and jeans",lighting:"Sunset warm light",camera_angle:"Medium portrait shot",audio_track:"rooftop_vibe_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Rooftop Cityscape",variant_name:"V3",action:"Walks across rooftop with city panorama",location:"Modern building top",wardrobe:"Athleisure fit",lighting:"Neon city glow at night",camera_angle:"Tracking gimbal shot",audio_track:"rooftop_vibe_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Private Gym",variant_name:"V1",action:"Explosive box jump in premium gym",location:"Private training facility",wardrobe:"Compression gear",lighting:"Dramatic top-lighting",camera_angle:"Wide action shot",audio_track:"gym_power_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Private Gym",variant_name:"V2",action:"Standing with arms crossed in front of weight rack",location:"Luxury home gym",wardrobe:"Branded training gear",lighting:"Soft overhead spots",camera_angle:"Medium power portrait",audio_track:"gym_power_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Private Gym",variant_name:"V3",action:"Doing battle ropes with intensity",location:"Open-air training space",wardrobe:"Tank top and shorts",lighting:"Natural morning light",camera_angle:"Slow-motion medium shot",audio_track:"gym_power_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Studio Portrait",variant_name:"V1",action:"Confident pose with direct eye contact",location:"Professional photo studio",wardrobe:"Tailored blazer no shirt",lighting:"Rembrandt studio lighting",camera_angle:"Tight medium shot",audio_track:"studio_mood_01",content_tier:"premium",platforms:"instagram,youtube" },
  { category:"Studio Portrait",variant_name:"V2",action:"Seated on stool with relaxed posture",location:"Minimalist white studio",wardrobe:"Smart casual turtleneck",lighting:"Soft diffused beauty lighting",camera_angle:"Medium portrait",audio_track:"studio_mood_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Studio Portrait",variant_name:"V3",action:"Standing profile silhouette",location:"Dark studio backdrop",wardrobe:"Fitted tee showing athletic build",lighting:"Single dramatic side light",camera_angle:"Artistic profile shot",audio_track:"studio_mood_03",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Game Day Tunnel",variant_name:"V1",action:"Walks through stadium tunnel toward field",location:"NFL-style concrete tunnel",wardrobe:"Full game day outfit with headphones",lighting:"Dramatic overhead tunnel lights",camera_angle:"Tracking follow shot",audio_track:"gameday_hype_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Game Day Tunnel",variant_name:"V2",action:"Stands at tunnel mouth with field visible beyond",location:"Stadium tunnel exit",wardrobe:"Warm-up gear",lighting:"Backlit by field lights",camera_angle:"Wide silhouette shot",audio_track:"gameday_hype_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Game Day Tunnel",variant_name:"V3",action:"High-fives teammates in tunnel",location:"Packed stadium walkway",wardrobe:"Team colors jersey",lighting:"Mixed fluorescent and daylight",camera_angle:"Handheld energy shot",audio_track:"gameday_hype_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Press Conference",variant_name:"V1",action:"Seated at press table with microphones",location:"Media room",wardrobe:"Polo shirt with team branding",lighting:"Flat broadcast panel lighting",camera_angle:"Front medium shot",audio_track:"press_conf_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Press Conference",variant_name:"V2",action:"Standing at podium addressing crowd",location:"Conference stage",wardrobe:"Suit and tie",lighting:"Stage spotlights",camera_angle:"Low-angle authority shot",audio_track:"press_conf_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Press Conference",variant_name:"V3",action:"Walking away from press table with confidence",location:"Media backdrop",wardrobe:"Business casual",lighting:"Mixed ambient",camera_angle:"Rear tracking shot",audio_track:"press_conf_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Charity Event",variant_name:"V1",action:"Kneeling with kids at community event",location:"Outdoor community center",wardrobe:"Casual branded gear",lighting:"Warm natural daylight",camera_angle:"Medium heartfelt shot",audio_track:"charity_warm_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Charity Event",variant_name:"V2",action:"Speaking at charity gala podium",location:"Ballroom event",wardrobe:"Formal suit",lighting:"Warm chandelier lighting",camera_angle:"Medium stage shot",audio_track:"charity_warm_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Charity Event",variant_name:"V3",action:"Handing out supplies at donation drive",location:"Gymnasium",wardrobe:"Team hoodie",lighting:"Bright indoor fluorescent",camera_angle:"Candid documentary shot",audio_track:"charity_warm_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Street Style",variant_name:"V1",action:"Walking down city sidewalk with confidence",location:"Downtown urban street",wardrobe:"Full designer streetwear",lighting:"Overcast soft diffused light",camera_angle:"Wide street-style shot",audio_track:"street_beat_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Street Style",variant_name:"V2",action:"Leaning against graffiti wall",location:"Arts district alley",wardrobe:"Vintage jacket and sneakers",lighting:"Shaded ambient with color reflections",camera_angle:"Medium editorial shot",audio_track:"street_beat_02",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Street Style",variant_name:"V3",action:"Crossing busy intersection",location:"Major city crosswalk",wardrobe:"Layered urban outfit",lighting:"Night with neon signs and headlights",camera_angle:"Wide cinematic street shot",audio_track:"street_beat_03",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Vacation Resort",variant_name:"V1",action:"Walking on white sand beach at sunset",location:"Tropical resort beach",wardrobe:"Linen shirt and shorts",lighting:"Golden hour warm light",camera_angle:"Wide paradise shot",audio_track:"vacation_chill_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Vacation Resort",variant_name:"V2",action:"Lounging by infinity pool overlooking ocean",location:"Luxury resort pool",wardrobe:"Swim trunks",lighting:"Bright midday tropical sun",camera_angle:"Medium lifestyle shot",audio_track:"vacation_chill_02",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Vacation Resort",variant_name:"V3",action:"Dining at oceanfront table",location:"Beachside restaurant",wardrobe:"Smart resort casual",lighting:"Warm string lights at dusk",camera_angle:"Medium intimate shot",audio_track:"vacation_chill_03",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Recording Studio",variant_name:"V1",action:"Standing at microphone in vocal booth",location:"Professional recording studio",wardrobe:"Oversized hoodie and chain",lighting:"Moody colored LED ambient",camera_angle:"Medium artistic shot",audio_track:"studio_session_01",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Recording Studio",variant_name:"V2",action:"Seated at mixing board with headphones",location:"Studio control room",wardrobe:"Casual tee",lighting:"Screen glow and low ambient",camera_angle:"Over-shoulder medium shot",audio_track:"studio_session_02",content_tier:"standard",platforms:"tiktok,instagram,youtube" },
  { category:"Recording Studio",variant_name:"V3",action:"Vibing in lounge area of studio",location:"Studio green room",wardrobe:"Streetwear",lighting:"Warm lamp light",camera_angle:"Candid relaxed shot",audio_track:"studio_session_03",content_tier:"social",platforms:"tiktok,instagram" },
  { category:"Brand Campaign",variant_name:"V1",action:"Holding branded product with hero pose",location:"Clean studio set",wardrobe:"Wardrobe matching brand colors",lighting:"Professional product lighting",camera_angle:"Medium commercial shot",audio_track:"brand_hero_01",content_tier:"premium",platforms:"instagram,youtube" },
  { category:"Brand Campaign",variant_name:"V2",action:"Using branded product in lifestyle setting",location:"Upscale location",wardrobe:"Casual aspirational outfit",lighting:"Natural plus fill light",camera_angle:"Medium-wide lifestyle commercial shot",audio_track:"brand_hero_02",content_tier:"premium",platforms:"instagram,youtube" },
  { category:"Brand Campaign",variant_name:"V3",action:"Behind-the-scenes of brand shoot",location:"On-set environment",wardrobe:"Relaxed between-takes outfit",lighting:"Mixed practical lighting",camera_angle:"Candid BTS shot",audio_track:"brand_hero_03",content_tier:"social",platforms:"tiktok,instagram" },
];

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();

    const { count } = await supabase
      .from("templates")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Templates already exist. Seed skipped to avoid duplicates." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("templates")
      .insert(SEED_TEMPLATES)
      .select("*");

    if (error) throw new Error(error.message);

    return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
