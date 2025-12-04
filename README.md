# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Theme / Mode toggles

This project supports two runtime display modes from the Dashboard UI:

- Dark mode: toggled by the sun/moon button in the top-right of the dashboard. The setting is persisted to
	`localStorage.theme` (`"dark"` or `"light"`) and is applied by adding/removing the `dark` class on the
	document element (Tailwind is configured with `darkMode: 'class'`).

- Reverse mode: toggled by the small "⇄" button next to the theme button. This applies a global CSS
	`filter: invert()` on `html` while re-inverting images/videos so media remain visually correct. The setting
	is persisted to `localStorage.reverse` (`"true"` / `"false"`).

How to test locally:

1. Start the dev server from `FrontEnd`:

```powershell
cd 'd:/Projects/FarmVisit/FrontEnd'
npm run dev
```

If PowerShell blocks running npm scripts on your machine, you can either run the same command from `cmd.exe`:

```powershell
cmd /c "cd /d d:\Projects\FarmVisit\FrontEnd && npm run dev"
```

2. Open http://localhost:5174 and sign in (if required). Use the sun/moon button to toggle dark mode and the
	 small ⇄ button to toggle reverse/invert mode. Both settings persist across reloads.

Notes:
- I added `tailwind.config.js` (ESM) with `darkMode: 'class'` so toggling the `dark` class works with Tailwind's
	`dark:` utilities.
- Reverse mode uses a quick global invert filter. If you'd prefer a variables-based theme swap for better
	accessibility and color control, I can implement that instead.
