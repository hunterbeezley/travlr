/**
 * Single source of truth for pin/place category -> icon + label, replacing
 * 8 independent copies of the same (or a divergent) emoji map that had
 * accumulated across PinPageClient, CollectionPageClient, PinProfileModal,
 * TimelineView, PinCreationModal, PinEditModal, CategoryBrowser, and
 * POISearch. Lucide icons instead of emoji for a consistent, deliberate
 * look rather than OS-dependent emoji rendering.
 */
import {
  UtensilsCrossed,
  Coffee,
  Beer,
  Target,
  Trees,
  ShoppingBag,
  Hotel,
  Bus,
  Sparkles,
  MapPin,
  Landmark,
  Waves,
  Mountain,
  Plane,
  type LucideIcon,
} from 'lucide-react'

export type PinCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'attraction'
  | 'nature'
  | 'shopping'
  | 'hotel'
  | 'transport'
  | 'activity'
  | 'other'

export const CATEGORY_ICONS: Record<PinCategory, LucideIcon> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  bar: Beer,
  attraction: Target,
  nature: Trees,
  shopping: ShoppingBag,
  hotel: Hotel,
  transport: Bus,
  activity: Sparkles,
  other: MapPin,
}

export const CATEGORY_LABELS: Record<PinCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar / Pub',
  attraction: 'Attraction',
  nature: 'Nature',
  shopping: 'Shopping',
  hotel: 'Hotel',
  transport: 'Transport',
  activity: 'Activity',
  other: 'Other',
}

export const PIN_CATEGORIES: { value: PinCategory; label: string; icon: LucideIcon }[] = (
  Object.keys(CATEGORY_ICONS) as PinCategory[]
).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
  icon: CATEGORY_ICONS[value],
}))

export function getCategoryIcon(category: string | null | undefined): LucideIcon {
  return CATEGORY_ICONS[category as PinCategory] || CATEGORY_ICONS.other
}

export function getCategoryLabel(category: string | null | undefined): string {
  return CATEGORY_LABELS[category as PinCategory] || CATEGORY_LABELS.other
}

/**
 * Broader browse/filter vocabulary (Discover/CategoryBrowser's filter chips
 * use finer-grained values - "coffee" vs "cafe", plus museum/park/beach/hike
 * as their own chips - that don't map 1:1 onto the canonical PinCategory
 * set above). Still pulls from the same shared icons rather than a 9th
 * independent emoji map.
 */
export const BROWSE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  ...CATEGORY_ICONS,
  coffee: Coffee,
  travel: Plane,
  museum: Landmark,
  park: Trees,
  beach: Waves,
  hike: Mountain,
}

/**
 * Maps a Google Places `types` array to a PinCategory, for surfaces (POI
 * search results) that only have Google's types, not an already-assigned
 * pin category. Mirrors mapGoogleTypeToCategory in placeHelpers.ts's
 * priority order.
 */
export function getCategoryIconForGoogleTypes(types: string[]): LucideIcon {
  const typeMap: Record<string, PinCategory> = {
    restaurant: 'restaurant',
    cafe: 'cafe',
    bakery: 'cafe',
    bar: 'bar',
    tourist_attraction: 'attraction',
    museum: 'attraction',
    park: 'nature',
    natural_feature: 'nature',
    shopping_mall: 'shopping',
    store: 'shopping',
    lodging: 'hotel',
    hotel: 'hotel',
    airport: 'transport',
    train_station: 'transport',
    transit_station: 'transport',
    spa: 'activity',
    gym: 'activity',
  }

  for (const type of types) {
    if (typeMap[type]) return CATEGORY_ICONS[typeMap[type]]
  }

  return CATEGORY_ICONS.other
}
