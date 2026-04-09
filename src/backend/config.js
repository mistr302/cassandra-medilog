import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: '24h',
  },
  cassandra: {
    contactPoints: (process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(','),
    localDataCenter: process.env.CASSANDRA_LOCAL_DC || 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || 'medilog',
    username: process.env.CASSANDRA_USERNAME || '',
    password: process.env.CASSANDRA_PASSWORD || '',
  },
};

export default config;
