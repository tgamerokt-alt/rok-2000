// PM2 process config. Run `npm run build` first, then `pm2 start ecosystem.config.js`.
// Next.js's `next start` already reads the PORT env var (can't be set via .env — the
// HTTP server boots before .env is loaded) — change PORT below to whatever's free on
// this server; check first with `netstat -ano | findstr :3001` (Windows) or
// `lsof -i :3001` (Linux) so it doesn't collide with another app already running.
module.exports = {
  apps: [
    {
      name: "rok-kingdom-stats",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
