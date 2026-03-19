export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
] as const;

export const POSITIONS = [
  "QB", "RB", "WR", "TE", "OL", "IOL", "OT", "DL", "EDGE", "LB", "CB", "S",
] as const;

export const CLASS_YEARS = [2025, 2026, 2027, 2028, 2029, 2030] as const;

export const STYLE_PREFERENCES = [
  "streetwear", "formal", "athleisure", "casual", "editorial",
] as const;

export const CONTENT_TIERS = [
  { value: "premium", label: "Premium", color: "text-yellow-400", dot: "bg-yellow-400" },
  { value: "standard", label: "Standard", color: "text-green-400", dot: "bg-green-400" },
  { value: "social", label: "Social", color: "text-blue-400", dot: "bg-blue-400" },
] as const;

export const DEFAULT_SETTINGS = {
  auto_approve_threshold: "90",
  review_threshold: "85",
  max_retries: "2",
  n8n_webhook_url: "",
  kling_api_key: "",
  runway_api_key: "",
  vidu_api_key: "",
  anthropic_api_key: "",
} as const;
