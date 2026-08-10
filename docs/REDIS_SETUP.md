# Redis setup — self-hosted, no account needed

`ekoru-users` uses Redis only as the backing store for its BullMQ notification
queue (see [`NOTIFICATIONS.md`](./NOTIFICATIONS.md)). **You do not need Redis
Cloud, Upstash, Azure Cache, or any managed/paid Redis account.** Redis runs as
an ordinary `redis:7-alpine` container on your own server, on the same private
Docker network as the subgraph. Nothing is exposed to the internet.

The compose files already exist — [`redis.staging.yml`](../redis.staging.yml)
and [`redis.prod.yml`](../redis.prod.yml). You just start one, once.

> **Why not reuse the transactions Redis?** Both instances run with
> `maxmemory-policy noeviction`, which means a service that fills its Redis
> starts failing writes rather than silently dropping job state. Sharing one
> instance would let a payment-queue backlog stop notification delivery, and
> vice versa. Two small containers keep that blast radius contained, and it
> matches the per-service pattern already used across the platform.

---

## What Redis needs from you

Exactly one thing: a password, `REDIS_PASSWORD`. It lives in `.env.staging` /
`.env.prod` and is read by **both** the app and the Redis container from that
same file — so they always agree.

The committed env files ship with `REDIS_PASSWORD=CHANGE_ME`. Generate a real
value per environment (use a **different** one for staging and prod):

```bash
openssl rand -hex 32
```

Paste it into `REDIS_PASSWORD` in the server-side secret file **before**
starting Redis. If you rotate it later, you must recreate both the Redis
container and the app.

---

## Staging: one-time setup

Redis is deliberately **not** in the Jenkinsfile — it's a long-lived container
that must survive app redeploys, so you bring it up by hand once. On the server:

```bash
# 0. The shared network must exist (created once for the whole staging stack):
docker network inspect ekoru-staging-network >/dev/null 2>&1 \
  || docker network create ekoru-staging-network

# 1. Put the secret env file in place (carries REDIS_PASSWORD):
#    /opt/ekoru/secrets/ekoru-users/.env.staging   (chmod 600)
cd /path/to/ekoru-users
cp /opt/ekoru/secrets/ekoru-users/.env.staging .env.staging

# 2. Start Redis (long-lived; you only ever run this once per server):
docker compose -f redis.staging.yml up -d

# 3. Verify it's healthy and auth works:
docker ps --filter name=ekoru-users-redis-staging
docker exec ekoru-users-redis-staging \
  redis-cli -a "$(grep '^REDIS_PASSWORD' .env.staging | cut -d= -f2)" ping
#   → PONG
```

## Production: one-time setup

Identical, against the prod network and file:

```bash
docker network inspect ekoru-network >/dev/null 2>&1 \
  || docker network create ekoru-network

cd /path/to/ekoru-users
cp /opt/ekoru/secrets/ekoru-users/.env.prod .env.prod
docker compose -f redis.prod.yml up -d

docker ps --filter name=ekoru-users-redis
docker exec ekoru-users-redis \
  redis-cli -a "$(grep '^REDIS_PASSWORD' .env.prod | cut -d= -f2)" ping
#   → PONG
```

---

## Env vars

| Var | Staging | Prod | Local dev |
|---|---|---|---|
| `REDIS_HOST` | `ekoru-users-redis-staging` | `ekoru-users-redis` | `localhost` |
| `REDIS_PORT` | `6379` | `6379` | `6379` |
| `REDIS_PASSWORD` | from `openssl rand -hex 32` | different value | empty is fine |
| `REDIS_TLS` | unset | unset | unset |

`REDIS_HOST` is the **container name**, not a host IP — Redis is not published
to the host, so it is only reachable over the Docker network. `REDIS_TLS=true`
is only for managed Redis (Azure Cache, Upstash); self-hosted on the private
network doesn't use it, so leave it unset.

---

## Local development

```bash
docker run -d --name ekoru-redis-dev -p 6379:6379 redis:7-alpine
```

No password needed — leave `REDIS_PASSWORD` empty in `.env`.

**Redis is not required to run the service locally.** Without it, `emit()` still
writes the in-app notification row and logs that delivery could not be queued;
email and push are simply skipped. The GraphQL API, the feed and every test work
unchanged.

---

## Operating it

```bash
# Health
docker ps --filter name=ekoru-users-redis
docker compose -f redis.prod.yml logs -f

# Queue depth (jobs waiting to be delivered)
docker exec ekoru-users-redis \
  redis-cli -a "$REDIS_PASSWORD" llen bull:notifications:wait

# Memory
docker exec ekoru-users-redis \
  redis-cli -a "$REDIS_PASSWORD" info memory | grep used_memory_human
```

A steadily growing `bull:notifications:wait` means the worker is not keeping up
or has crashed — check the app logs for `NotificationsProcessor`.
