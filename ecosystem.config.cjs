module.exports = {
  apps: [
    {
      name: "echat",
      cwd: "/var/www/eChat",
      script: "npm",
      args: "start",
      interpreter: "none",

      env: {
        NODE_ENV: "production",
      },

      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 5000,

      error_file: "/var/log/pm2/echat-error.log",
      out_file: "/var/log/pm2/echat-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};