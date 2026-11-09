/** Company vocabulary (B2). Fixed presets rather than free text, so every
 * word has a reviewed English and Puerto Rico Spanish form and copy stays
 * grammatical. Applied to navigation, settings and page titles; full
 * sentences adopt these slots when strings move into dictionaries (B5). */
export const WORD_PRESET_IDS = ["standard", "retail", "restaurant", "field", "care"] as const;
export type WordPresetId = (typeof WORD_PRESET_IDS)[number];
export type WordSlots = { person: string; people: string; location: string; locations: string };
export type WordPreset = { id: WordPresetId; name: string; en: WordSlots; es: WordSlots };

export const WORD_PRESETS: WordPreset[] = [
  { id: "standard", name: "Standard",
    en: { person: "Employee", people: "Employees", location: "Location", locations: "Locations" },
    es: { person: "Empleado", people: "Empleados", location: "Ubicación", locations: "Ubicaciones" } },
  { id: "retail", name: "Retail",
    en: { person: "Associate", people: "Associates", location: "Store", locations: "Stores" },
    es: { person: "Asociado", people: "Asociados", location: "Tienda", locations: "Tiendas" } },
  { id: "restaurant", name: "Restaurant",
    en: { person: "Team member", people: "Team members", location: "Restaurant", locations: "Restaurants" },
    es: { person: "Miembro del equipo", people: "Miembros del equipo", location: "Restaurante", locations: "Restaurantes" } },
  { id: "field", name: "Field services",
    en: { person: "Technician", people: "Technicians", location: "Site", locations: "Sites" },
    es: { person: "Técnico", people: "Técnicos", location: "Sede", locations: "Sedes" } },
  { id: "care", name: "Care",
    en: { person: "Caregiver", people: "Caregivers", location: "Facility", locations: "Facilities" },
    es: { person: "Cuidador", people: "Cuidadores", location: "Instalación", locations: "Instalaciones" } },
];

export const DEFAULT_WORDS = WORD_PRESETS[0];
export const wordPreset = (id: unknown): WordPreset => WORD_PRESETS.find(p => p.id === id) ?? DEFAULT_WORDS;
/** For mid-sentence use: "Add team member", "All stores". */
export const lower = (word: string) => word.charAt(0).toLowerCase() + word.slice(1);
