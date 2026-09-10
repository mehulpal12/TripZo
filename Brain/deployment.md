# Deployment

## Local development

Recommended services:

```text
Node.js
PostgreSQL
Redis
React
```

Use Docker Compose for PostgreSQL and Redis if desired.

## Environment variables

See `.env.example`.

Never commit real credentials.

## Production topology

```text
Internet
   |
Reverse Proxy / Load Balancer
   |
+--+----------------+
|                   |
Node API        Node Worker
|                   |
+--------+----------+
         |
    PostgreSQL
         |
       Redis
```

If multiple Socket.IO servers are used, configure the Redis adapter.

## Deployment requirements

- HTTPS
- secure cookies
- CORS allowlist
- database migrations
- health checks
- graceful shutdown
- logs
- backups
- secret management

## Graceful shutdown

On SIGTERM:
1. stop accepting new HTTP requests;
2. stop consuming new jobs;
3. allow active work to finish where practical;
4. close Socket.IO;
5. close Redis;
6. close PostgreSQL pool;
7. exit.
