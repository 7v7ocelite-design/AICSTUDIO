-- AiC Content Studio — V5 Seed Templates (15 categories × 3 variants = 45 rows)
-- Content tier determines engine routing: standard→Kling, premium→Runway, social→Vidu

INSERT INTO templates (category, variant_name, action, location, wardrobe, lighting, camera_angle, audio_track, content_tier, platforms)
VALUES
  -- 1. Jet Arrival
  ('Jet Arrival', 'V1', 'Steps off private jet onto tarmac', 'Luxury airport tarmac', 'Designer travel outfit', 'Golden hour backlight', 'Wide tracking shot', 'jet_arrival_epic_01', 'standard', 'tiktok,instagram,youtube'),
  ('Jet Arrival', 'V2', 'Walks down jet stairs with luggage', 'Tropical airstrip', 'Casual luxury streetwear', 'Bright midday sun', 'Low-angle hero shot', 'jet_arrival_epic_02', 'standard', 'tiktok,instagram,youtube'),
  ('Jet Arrival', 'V3', 'Pauses at jet doorway looking back', 'Night tarmac with runway lights', 'All-black ensemble', 'Dramatic rim lighting', 'Medium cinematic shot', 'jet_arrival_epic_03', 'premium', 'instagram,youtube'),

  -- 2. Penthouse Lifestyle
  ('Penthouse Lifestyle', 'V1', 'Stands at floor-to-ceiling windows overlooking skyline', 'Modern penthouse', 'Tailored suit', 'Warm interior ambient plus city glow', 'Wide establishing shot', 'penthouse_chill_01', 'standard', 'tiktok,instagram,youtube'),
  ('Penthouse Lifestyle', 'V2', 'Relaxes on rooftop terrace with drink', 'Penthouse balcony', 'Designer loungewear', 'Sunset golden hour', 'Medium over-shoulder shot', 'penthouse_chill_02', 'standard', 'tiktok,instagram,youtube'),
  ('Penthouse Lifestyle', 'V3', 'Walks through minimalist penthouse interior', 'Open-plan living space', 'Smart casual', 'Soft diffused natural light', 'Steadicam tracking shot', 'penthouse_chill_03', 'social', 'tiktok,instagram'),

  -- 3. Luxury Car
  ('Luxury Car', 'V1', 'Leans against matte black sports car', 'Underground parking garage', 'Streetwear with chain', 'Moody overhead fluorescent', 'Wide low-angle shot', 'luxury_car_drive_01', 'standard', 'tiktok,instagram,youtube'),
  ('Luxury Car', 'V2', 'Steps out of luxury SUV', 'Hotel valet entrance', 'Business casual blazer', 'Warm evening light', 'Medium tracking shot', 'luxury_car_drive_02', 'standard', 'tiktok,instagram,youtube'),
  ('Luxury Car', 'V3', 'Drives convertible on coastal highway', 'Ocean cliff road', 'Casual summer fit', 'Bright natural sunlight', 'Drone aerial follow shot', 'luxury_car_drive_03', 'premium', 'instagram,youtube'),

  -- 4. Red Carpet
  ('Red Carpet', 'V1', 'Poses on red carpet with step-and-repeat backdrop', 'Awards venue entrance', 'Custom designer suit', 'Flash photography lighting', 'Front-facing medium shot', 'red_carpet_glam_01', 'premium', 'instagram,youtube'),
  ('Red Carpet', 'V2', 'Walks red carpet waving to crowd', 'Premiere event', 'Formal tuxedo', 'Warm spotlights', 'Side tracking shot', 'red_carpet_glam_02', 'standard', 'tiktok,instagram,youtube'),
  ('Red Carpet', 'V3', 'Pauses for interview on carpet', 'Media wall backdrop', 'Tailored outfit with pocket square', 'Broadcast lighting', 'Medium close-up', 'red_carpet_glam_03', 'standard', 'tiktok,instagram,youtube'),

  -- 5. Yacht Life
  ('Yacht Life', 'V1', 'Stands at bow of yacht overlooking ocean', 'Open water', 'Swim trunks and open shirt', 'Bright midday sun with water reflections', 'Wide hero shot', 'yacht_life_wave_01', 'standard', 'tiktok,instagram,youtube'),
  ('Yacht Life', 'V2', 'Relaxes on yacht deck with sunglasses', 'Marina harbor', 'Casual resort wear', 'Golden hour side light', 'Medium lifestyle shot', 'yacht_life_wave_02', 'social', 'tiktok,instagram'),
  ('Yacht Life', 'V3', 'Dives off yacht into turquoise water', 'Tropical bay', 'Swimwear', 'Overhead bright sun', 'Drone top-down shot', 'yacht_life_wave_03', 'social', 'tiktok,instagram'),

  -- 6. Rooftop Cityscape
  ('Rooftop Cityscape', 'V1', 'Stands at rooftop edge overlooking downtown', 'Skyscraper rooftop', 'Streetwear hoodie', 'Blue hour city lights', 'Wide cinematic shot', 'rooftop_vibe_01', 'standard', 'tiktok,instagram,youtube'),
  ('Rooftop Cityscape', 'V2', 'Sits on rooftop ledge with skyline behind', 'Industrial rooftop', 'Designer jacket and jeans', 'Sunset warm light', 'Medium portrait shot', 'rooftop_vibe_02', 'standard', 'tiktok,instagram,youtube'),
  ('Rooftop Cityscape', 'V3', 'Walks across rooftop with city panorama', 'Modern building top', 'Athleisure fit', 'Neon city glow at night', 'Tracking gimbal shot', 'rooftop_vibe_03', 'social', 'tiktok,instagram'),

  -- 7. Private Gym
  ('Private Gym', 'V1', 'Explosive box jump in premium gym', 'Private training facility', 'Compression gear', 'Dramatic top-lighting', 'Wide action shot', 'gym_power_01', 'standard', 'tiktok,instagram,youtube'),
  ('Private Gym', 'V2', 'Standing with arms crossed in front of weight rack', 'Luxury home gym', 'Branded training gear', 'Soft overhead spots', 'Medium power portrait', 'gym_power_02', 'standard', 'tiktok,instagram,youtube'),
  ('Private Gym', 'V3', 'Doing battle ropes with intensity', 'Open-air training space', 'Tank top and shorts', 'Natural morning light', 'Slow-motion medium shot', 'gym_power_03', 'social', 'tiktok,instagram'),

  -- 8. Studio Portrait
  ('Studio Portrait', 'V1', 'Confident pose with direct eye contact', 'Professional photo studio', 'Tailored blazer no shirt', 'Rembrandt studio lighting', 'Tight medium shot', 'studio_mood_01', 'premium', 'instagram,youtube'),
  ('Studio Portrait', 'V2', 'Seated on stool with relaxed posture', 'Minimalist white studio', 'Smart casual turtleneck', 'Soft diffused beauty lighting', 'Medium portrait', 'studio_mood_02', 'standard', 'tiktok,instagram,youtube'),
  ('Studio Portrait', 'V3', 'Standing profile silhouette', 'Dark studio backdrop', 'Fitted tee showing athletic build', 'Single dramatic side light', 'Artistic profile shot', 'studio_mood_03', 'standard', 'tiktok,instagram,youtube'),

  -- 9. Game Day Tunnel
  ('Game Day Tunnel', 'V1', 'Walks through stadium tunnel toward field', 'NFL-style concrete tunnel', 'Full game day outfit with headphones', 'Dramatic overhead tunnel lights', 'Tracking follow shot', 'gameday_hype_01', 'standard', 'tiktok,instagram,youtube'),
  ('Game Day Tunnel', 'V2', 'Stands at tunnel mouth with field visible beyond', 'Stadium tunnel exit', 'Warm-up gear', 'Backlit by field lights', 'Wide silhouette shot', 'gameday_hype_02', 'standard', 'tiktok,instagram,youtube'),
  ('Game Day Tunnel', 'V3', 'High-fives teammates in tunnel', 'Packed stadium walkway', 'Team colors jersey', 'Mixed fluorescent and daylight', 'Handheld energy shot', 'gameday_hype_03', 'social', 'tiktok,instagram'),

  -- 10. Press Conference
  ('Press Conference', 'V1', 'Seated at press table with microphones', 'Media room', 'Polo shirt with team branding', 'Flat broadcast panel lighting', 'Front medium shot', 'press_conf_01', 'standard', 'tiktok,instagram,youtube'),
  ('Press Conference', 'V2', 'Standing at podium addressing crowd', 'Conference stage', 'Suit and tie', 'Stage spotlights', 'Low-angle authority shot', 'press_conf_02', 'standard', 'tiktok,instagram,youtube'),
  ('Press Conference', 'V3', 'Walking away from press table with confidence', 'Media backdrop', 'Business casual', 'Mixed ambient', 'Rear tracking shot', 'press_conf_03', 'social', 'tiktok,instagram'),

  -- 11. Charity Event
  ('Charity Event', 'V1', 'Kneeling with kids at community event', 'Outdoor community center', 'Casual branded gear', 'Warm natural daylight', 'Medium heartfelt shot', 'charity_warm_01', 'standard', 'tiktok,instagram,youtube'),
  ('Charity Event', 'V2', 'Speaking at charity gala podium', 'Ballroom event', 'Formal suit', 'Warm chandelier lighting', 'Medium stage shot', 'charity_warm_02', 'standard', 'tiktok,instagram,youtube'),
  ('Charity Event', 'V3', 'Handing out supplies at donation drive', 'Gymnasium', 'Team hoodie', 'Bright indoor fluorescent', 'Candid documentary shot', 'charity_warm_03', 'social', 'tiktok,instagram'),

  -- 12. Street Style
  ('Street Style', 'V1', 'Walking down city sidewalk with confidence', 'Downtown urban street', 'Full designer streetwear', 'Overcast soft diffused light', 'Wide street-style shot', 'street_beat_01', 'standard', 'tiktok,instagram,youtube'),
  ('Street Style', 'V2', 'Leaning against graffiti wall', 'Arts district alley', 'Vintage jacket and sneakers', 'Shaded ambient with color reflections', 'Medium editorial shot', 'street_beat_02', 'social', 'tiktok,instagram'),
  ('Street Style', 'V3', 'Crossing busy intersection', 'Major city crosswalk', 'Layered urban outfit', 'Night with neon signs and headlights', 'Wide cinematic street shot', 'street_beat_03', 'standard', 'tiktok,instagram,youtube'),

  -- 13. Vacation Resort
  ('Vacation Resort', 'V1', 'Walking on white sand beach at sunset', 'Tropical resort beach', 'Linen shirt and shorts', 'Golden hour warm light', 'Wide paradise shot', 'vacation_chill_01', 'standard', 'tiktok,instagram,youtube'),
  ('Vacation Resort', 'V2', 'Lounging by infinity pool overlooking ocean', 'Luxury resort pool', 'Swim trunks', 'Bright midday tropical sun', 'Medium lifestyle shot', 'vacation_chill_02', 'social', 'tiktok,instagram'),
  ('Vacation Resort', 'V3', 'Dining at oceanfront table', 'Beachside restaurant', 'Smart resort casual', 'Warm string lights at dusk', 'Medium intimate shot', 'vacation_chill_03', 'standard', 'tiktok,instagram,youtube'),

  -- 14. Recording Studio
  ('Recording Studio', 'V1', 'Standing at microphone in vocal booth', 'Professional recording studio', 'Oversized hoodie and chain', 'Moody colored LED ambient', 'Medium artistic shot', 'studio_session_01', 'standard', 'tiktok,instagram,youtube'),
  ('Recording Studio', 'V2', 'Seated at mixing board with headphones', 'Studio control room', 'Casual tee', 'Screen glow and low ambient', 'Over-shoulder medium shot', 'studio_session_02', 'standard', 'tiktok,instagram,youtube'),
  ('Recording Studio', 'V3', 'Vibing in lounge area of studio', 'Studio green room', 'Streetwear', 'Warm lamp light', 'Candid relaxed shot', 'studio_session_03', 'social', 'tiktok,instagram'),

  -- 15. Brand Campaign
  ('Brand Campaign', 'V1', 'Holding branded product with hero pose', 'Clean studio set', 'Wardrobe matching brand colors', 'Professional product lighting', 'Medium commercial shot', 'brand_hero_01', 'premium', 'instagram,youtube'),
  ('Brand Campaign', 'V2', 'Using branded product in lifestyle setting', 'Upscale location', 'Casual aspirational outfit', 'Natural plus fill light', 'Medium-wide lifestyle commercial shot', 'brand_hero_02', 'premium', 'instagram,youtube'),
  ('Brand Campaign', 'V3', 'Behind-the-scenes of brand shoot', 'On-set environment', 'Relaxed between-takes outfit', 'Mixed practical lighting', 'Candid BTS shot', 'brand_hero_03', 'social', 'tiktok,instagram')
ON CONFLICT DO NOTHING;
