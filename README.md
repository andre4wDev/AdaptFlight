# AdaptFlight React website

## Project links

- Website: https://andre4wdev.github.io/AdaptFlight/
- About Us: https://andre4wdev.github.io/AdaptFlight/#/about
- Repository: https://github.com/andre4wDev/AdaptFlight
- Deployment status: https://github.com/andre4wDev/AdaptFlight/actions


This React + Vite project covers the AdaptFlight website.

## Interactive flight lab

The Products page includes a third-person 3D drone simulation. Start the flight, adjust crosswind, payload, or motor strength, and use **Send a sudden gust** to introduce a disturbance. Toggle adaptive compensation to compare behavior and switch between the chase camera and course view. The coral comparison drone receives the same conditions with the same basic route controller, without adaptive compensation.

Motion comes from a deterministic, simplified point-mass model. The adaptive controller estimates unexpected acceleration and counters it; it is not a trained AI model. Forward speed is fixed. Gate clearance is checked at crossings, and contacts are scored while the flight continues; this is not a rigid-body crash simulator or validated aircraft software.

- `src/components/FlightPreview.jsx` and `FlightPreview.css`: controls, telemetry, and layout.
- `src/simulation/flightPhysics.js`: forces, controllers, route, and gate clearance.
- `src/simulation/flightScene.js`: Three.js scene and cameras, loaded separately from the page.

Use Node.js 24, then run `npm ci`, `npm test`, and `npm run dev`. Run `npm run build` to check the production bundle. Commits pushed to `main` are tested, built, and published automatically by GitHub Actions.
