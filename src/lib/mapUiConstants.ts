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
  feedbackButton: 1300,
  feedbackModalBackdrop: 2000,
  feedbackModalContent: 2001,
} as const

// The working left-side FAB stack (Map Layers + mobile collections button)
// uses a 4rem gap between two 56px circular buttons with no overlap - the
// canonical spacing pattern for any future stacked FABs.
export const FAB = {
  size: 56, // px
  gap: '4rem',
} as const

// Below the sticky navbar (which collapses to a single brand-only row on
// mobile, so its rendered height varies slightly by breakpoint) with enough
// clearance to comfortably clear it at every breakpoint.
export const BELOW_NAVBAR_TOP = 'calc(env(safe-area-inset-top) + 4.5rem)'
