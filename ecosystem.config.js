module.exports = {
  apps: [
    {
      name: "echat-web",
      cwd: "/root/projects/echat",
      script: "npm",
      args: "start",
      env: {
        PORT: 6001,
        NODE_ENV: "production",        
      },

      autorestart: true,
      watch: false,

      error_file: "/var/log/pm2/echat-frontend-error.log",
      out_file: "/var/log/pm2/echat-frontend-out.log",

      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    {
      name: "echat-api",

      cwd: "/root/projects/echat/server",

      script: "src/index.js",

      env: {
        NODE_ENV: "production",
        PORT: 6100,
      },

      autorestart: true,
      watch: false,

      error_file: "/var/log/pm2/echat-api-error.log",
      out_file: "/var/log/pm2/echat-api-out.log",

      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};