# Racecraft

Rocket League–style 3D car soccer that runs in the browser. Built with Vite, TypeScript, Three.js and Rapier (`@dimforge/rapier3d-compat`). No paid assets or services: every model, texture and sound is generated in code.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Put it on its own website

`npm run build` (or `npx vite build --base=./`) produces a static site in `dist/`: one `index.html` plus an `assets/` folder. It needs no server code, so any static host works. A ready-made zip of that folder is `racecraft-site.zip`. All of these are free:

- **Netlify Drop** (fastest, no Git): go to https://app.netlify.com/drop and drag the unzipped folder onto the page. You get a link like `racecraft-xyz.netlify.app`. Create a free account to keep it online permanently and rename it.
- **itch.io** (made for games): create a new project, choose *Kind of project: HTML*, upload `racecraft-site.zip`, and tick *This file will be played in the browser*. Set the viewport to 1280 × 720 and enable the fullscreen button.
- **GitHub Pages**: push this project to a GitHub repo, then in *Settings → Pages* choose *Source: GitHub Actions*. The included workflow (`.github/workflows/deploy.yml`) builds and publishes the site on every push to `main`, at `https://<you>.github.io/<repo>/`.
- **Cloudflare Workers** (gives `racecraft.<you>.workers.dev`): in the Cloudflare dashboard go to *Workers & Pages → Create → Import a repository*, pick this repo, and set the build command to `npx vite build --base=./` and the deploy command to `npx wrangler deploy`. `wrangler.jsonc` tells Cloudflare to serve the built `dist/` folder. Every push to `main` redeploys automatically.
- **Cloudflare Pages / Vercel**: import the repo with build command `npx vite build --base=./` and output directory `dist`.

## Modes

- **1v1 Duel**: you against one bot.
- **2v2 Doubles**: you and a bot teammate against two bots.
- Bot difficulty: Rookie, Pro or All-Star.

There is no online multiplayer. Everything runs locally in one browser tab.

## Controls

| Action | Keyboard / mouse | Gamepad |
| --- | --- | --- |
| Throttle / reverse | W / S (or ↑ / ↓) | RT / LT |
| Steer | A / D (or ← / →) | Left stick |
| Pitch / yaw (air) | W S / A D | Left stick |
| Jump, double jump, flip (jump + direction) | Space / right mouse | A |
| Boost | Shift / left mouse | B |
| Powerslide, air roll (+ A/D) | Q / Ctrl | X |
| Air roll right | E | LB / RB (left / right) |
| Ball cam on / off | Y | Y |
| Camera distance | [ / ] or mouse wheel | |
| Hide / show the control guide | H | |
| Pause (resume, restart, camera settings) | Esc / P | Start |
| Menus without a mouse | Arrow keys to move, Enter to select, Esc to go back | D-pad / left stick, A, B |
| Mute | M | |

Q is safer than Ctrl in a browser, because Ctrl+W closes the tab.

## World scale

1 world unit = 51.2 Rocket League units (uu). The field is 200 × 160 units (RL: 10240 × 8192 uu) with a 40-unit ceiling. Goals are 35 × 12.5 × 16 units. The car hitbox matches RL's Octane (118 × 84 × 36 uu) and the ball has RL's 92.75 uu radius. Speeds, accelerations, jump impulses, boost and the hit model are RL's values converted with the same factor (`UU` in `src/game/Config.ts`), so sizes and speeds stay consistent with each other.

## Garage

Open **Garage** from the main menu. Every option changes the rendered car:

- Body style: Striker, Viper, Brute, Wedge. All four share the same physics hitbox.
- Primary and secondary paint (swatches or any custom color)
- Paint finish: gloss, metallic, matte, pearl, chrome
- Rim design (5) and rim color (8)
- Spoiler: none, ducktail, wing, GT wing
- Decals: stripes, flames, lightning, race number, digital camo, two-tone
- Boost color (9, including team and rainbow) and boost trail (flame, plasma, sparkle)
- Headlights, underglow, and an accessory (antenna, light bar, hood scoop)

**Save & Equip** stores the design in the browser's `localStorage` (`racecraft.design.v1`). Your match car then uses it. Bots get random designs in their team's colors, and every car has a team-colored side strip.

### Dream Car Designer

Type a description, for example: *"futuristic black-and-electric-blue supercar with gold rims, a low body, a large rear wing, and bright blue boost flames."*

- **Generate** interprets the text and previews the design on the turntable.
- **Regenerate** keeps what you asked for and remixes the parts you didn't mention.
- **Preview** shows the generated design again after manual edits.
- **Apply to car** saves it and equips it.

The built-in designer is **not an AI model**. It is a local keyword parser (`src/game/DesignAssistant.ts`): color words are matched with their context ("gold rims", "blue boost"), along with style, finish, wheel, spoiler, decal and accessory keywords. It needs no network access and no API key. Every result goes through `validateDesign()` (`src/game/CarDesign.ts`), which only accepts values from the allowlists. Generated text is never executed.

#### Connecting a real AI model later

The client already supports a server endpoint. API keys must stay on a server and never go in client code.

1. Build a small server endpoint (for example `POST /api/design`). It receives:
   ```json
   { "prompt": "…", "variation": 0, "allowed": { "body": ["striker", "viper", "brute", "wedge"], "finish": ["…"], "…": [] } }
   ```
   It calls the AI model with the key from its own environment, and returns:
   ```json
   { "design": { "body": "viper", "primary": "#121318", "secondary": "#1e7bff", "…": "…" },
     "summary": [{ "part": "Body", "value": "Viper", "from": "low supercar" }],
     "notes": ["…"] }
   ```
2. Build the client with `VITE_DESIGN_API_URL=https://your-server/api/design npm run build`.

`createDesignProvider()` then switches to `RemoteDesignProvider`. Its response is still validated against the allowlists, so the model can only pick supported parts.

## Code layout

- `src/main.ts`: boot, renderer, menus, pause/settings, and the garage/match render loop
- `src/game/Config.ts`: world scale and tuning constants
- `src/game/Arena.ts`: analytic arena SDF (smooth suspension normals), Rapier trimesh and colliders, field texture and markings, boost pads, stadium (stands, LED boards, light beams, goal lighting, celebrations)
- `src/game/Car.ts`: raycast-suspension car physics: drive, powerslide, boost, jumps, flips, air control, wall driving, auto-righting
- `src/game/CarModel.ts`: procedural car models (body styles, decals, wheels, lights, spoilers, accessories)
- `src/game/CarDesign.ts`: customization allowlists, validation, save/load
- `src/game/Garage.ts`: garage scene and UI
- `src/game/DesignAssistant.ts`: local Dream Car Designer plus the remote-provider hook
- `src/game/Ball.ts`: ball body, Rocket League hit model, path prediction
- `src/game/AI.ts`: bots (Rookie, Pro, All-Star)
- `src/game/Match.ts`: match flow (kickoffs, clock, overtime, goals, replays, demos, stats)
- `src/game/Camera.ts`, `HUD.ts`, `Input.ts`, `Audio.ts`, `Particles.ts`

Physics runs at a fixed 120 Hz step, and rendering interpolates between steps.
