export const STAGES = [
  {
    id: "forest-lake",
    name: "Forest Lake",
    description: "Alpine water. Golden light.",
    color: "#789388",
  },
  {
    id: "mountain-river",
    name: "Mountain River",
    description: "A wild course through the pines.",
    color: "#708e96",
  },
  {
    id: "lotus-pond",
    name: "Lotus Pond",
    description: "Still water. A little wonder.",
    color: "#87966b",
  },
  {
    id: "sunset-marsh",
    name: "Sunset Marsh",
    description: "One last race before nightfall.",
    color: "#be8959",
  },
  {
    id: "village-canal",
    name: "Village Canal",
    description: "Past the bridge and home again.",
    color: "#919582",
  },
];
export const BREEDS = [
  { id: "mallard", name: "Mallard", description: "Emerald head · chestnut breast" },
  { id: "pekin", name: "White Pekin", description: "Ivory feathers · orange bill" },
  { id: "khaki", name: "Khaki Campbell", description: "Warm brown · delicate plumage" },
  { id: "mandarin", name: "Mandarin", description: "Rich colour · signature sail feathers" },
  { id: "runner", name: "Runner", description: "Upright stance · slender silhouette" },
];
export const ACCESSORIES = [
  { id: "none", name: "None" },
  { id: "hat", name: "Explorer Hat" },
  { id: "glasses", name: "Aviator Glasses" },
  { id: "bow", name: "Bow Tie" },
  { id: "medal", name: "Race Medal" },
  { id: "charm", name: "Luck Charm" },
  { id: "badge", name: "Duck Badge" },
];
export const SAMPLE = "Group 1\nGroup 2\nGroup 3\nGroup 4\nGroup 5\nGroup 6";
export const COLORS = ["#d9b345", "#55a66a", "#e9e7db", "#b18a62", "#649dcc", "#b089c4"];
export function formatTime(ms) {
  const safeMs = Number.isFinite(ms) ? ms : 0;
  const value = Math.max(0, Math.floor(safeMs / 10));
  return `${String(Math.floor(value / 6000)).padStart(2, "0")}:${String(Math.floor(value / 100) % 60).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}`;
}
