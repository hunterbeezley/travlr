// Single source of truth for floating-UI stacking order and spacing on/around
// the map experience. Values here previously lived as ad hoc magic numbers
// scattered across Map.tsx, FeedbackButton.tsx, MapLayersModal.tsx,
// MobileNav.tsx, and BottomSheet.tsx, which had drifted into a real collision
// (MapLayersModal and BottomSheet both used 999/1000).

export const Z_INDEX = {
  mapSidebar: 10,
  mapControls: 500, // Map Layers FAB (no-sidebar contexts), mobile collections FAB
  bottomSheet: 998,
  bottomSheetContent: 999,
  mapLayersModalBackdrop: 1050,
  mapLayersModalContent: 1051,
  mobileNav: 1100,
  discoverDetailModalBackdrop: 1200,
  discoverDetailModalContent: 1201,
  feedbackModalBackdrop: 2000,
  feedbackModalContent: 2001,
} as const

// Left-side FAB stack (Map Layers + mobile collections button). Both bottom
// offsets must add env(safe-area-inset-bottom) individually - a plain 4rem
// gap between two 56px buttons looks fine in desktop devtools emulation
// (no simulated safe area) but overlaps for real on notched iPhones, where
// the safe-area inset eats into the gap between the two offsets.
export const FAB = {
  size: 56, // px
  mobileCollectionsBottom: 'calc(5rem + env(safe-area-inset-bottom))',
  mapLayersBottomMobile: 'calc(9rem + env(safe-area-inset-bottom))',
} as const
