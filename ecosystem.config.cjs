module.exports = {
    apps: [
      {
        name: "echat-api",
        cwd: "/var/www/eChat/server",
        script: "src/index.js",
        interpreter: "node",
        env: {
          NODE_ENV: "production",
          PORT: 4040,
        },
      },
    ],
  };