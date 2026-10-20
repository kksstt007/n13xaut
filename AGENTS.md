# Project rules
- Keep the signed-in Home in the existing dashboard route and its reusable banner carousel in a separate component, so shared navigation and account flows remain unchanged.
- Home market snapshots use public market responses without synthetic prices, so API failures cannot appear as real quotes.
- Home funds actions reuse the existing deposit sheet and withdrawal wizard directly, so account flows stay consistent without a detour to Profile.
- Load the live-chat script after React hydration, so third-party document mutations cannot disrupt initial rendering.