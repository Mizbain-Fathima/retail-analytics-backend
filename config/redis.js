const { createClient } = require('redis');

const redisConfig = {
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.log('Too many retries on REDIS. Connection terminated');
        return new Error('Too many retries');
      } else {
        return retries * 500;
      }
    }
  }
};

const client = createClient(redisConfig);

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('🔌 Connecting to Redis Cloud...');
});

client.on('ready', () => {
  console.log('✅ Redis Cloud client ready');
});

module.exports = client;