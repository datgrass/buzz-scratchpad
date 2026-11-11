# Scratchpad spike plugin

Throwaway spike: a dock page, buzzboard fold, relay read and outbox probe. Not the real plugin.

1. `cp src/spike.config.example.json src/spike.config.json` and fill in your private test channel / lane IDs.
2. `npm install && npm test && npm run build` → `plugin.js` (gitignored build output).
3. Buzz → Settings → Plugins → Manage plugins → Add → folder → this directory.
