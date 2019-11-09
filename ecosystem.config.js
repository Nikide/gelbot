module.exports = {
  apps : [{
    name: 'GBOT',
    script: './app.js',

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
   
    autorestart: true,
    watch: true,
    exec_mode: 'cluster',
   cron_restart: '*/5 * * * *',
    max_memory_restart: '200M',
  }],

  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
