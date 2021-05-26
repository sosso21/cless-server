module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        host: env('DATABASE_HOST', 'cless.azgit.mongodb.net'),
        srv: env.bool('DATABASE_SRV', true),
        port: env.int('DATABASE_PORT', 27017),
        database: env('DATABASE_NAME', 'server'),
        username: env('DATABASE_USERNAME',"admin" ),
        password: env('DATABASE_PASSWORD',"0000" ),
      },
      options: {
        authenticationDatabase: env('AUTHENTICATION_DATABASE'),
        ssl: env.bool('DATABASE_SSL', true),
      },
    },
  },
});
