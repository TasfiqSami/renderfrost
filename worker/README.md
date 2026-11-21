# Status proxy

Serves `GET /api/status` for the Members page. The Pterodactyl API key is stored
as a Worker **secret**, never in the website.

## Deploy
```bash
cd worker
npx wrangler login
npx wrangler secret put PTERO_API_KEY     # paste a NEW key, not one shared in chat
# edit wrangler.toml: uncomment `routes`, set SHOW_WHITELIST = "true" to list members
npx wrangler deploy
```
The route must put the Worker on your own domain (`renderfrost.com/api/status`) so
the page calls it same-origin. If the Worker isn't deployed, the Members page
falls back to its static explanation.

## Response
`{ state, online, uptime, players: {online,max,list}|null, members: [names]|null, updated }`

## Notes
- Use a client API key from an account limited to this one server. Revoke any key that has been shared.
- Player count/list needs `MC_HOST` and the server reachable by the public status service.
- Whitelist names are published only when `SHOW_WHITELIST = "true"`. Make sure members agree.
