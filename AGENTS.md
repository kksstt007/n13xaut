# Project rules
- Keep the signed-in Home in the existing dashboard route and its reusable banner carousel in a separate component, so shared navigation and account flows remain unchanged.
- Home market snapshots use public market responses without synthetic prices, so API failures cannot appear as real quotes.