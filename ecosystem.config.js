module.exports = {
  apps: [{
    name: 'world-cup-api',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env_file: '.env'
  }]
}
