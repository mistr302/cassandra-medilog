import cassandra from 'cassandra-driver';
import config from '../config.js';

const authProvider = config.cassandra.username
  ? new cassandra.auth.PlainTextAuthProvider(config.cassandra.username, config.cassandra.password)
  : undefined;

const client = new cassandra.Client({
  contactPoints: config.cassandra.contactPoints,
  localDataCenter: config.cassandra.localDataCenter,
  keyspace: config.cassandra.keyspace,
  authProvider,
  queryOptions: { prepare: true, consistency: cassandra.types.consistencies.localQuorum },
});

export default client;
export const types = cassandra.types;
export const mapping = cassandra.mapping;
