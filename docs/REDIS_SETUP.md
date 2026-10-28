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

Exactly one thing: a password, `REDIS_PASSWORD`. It lives in Infisical, folder
`/ekoru-users`, in `staging` and `prod`. Every app deploy exports it from there,
and the Redis container gets the same value when you create it (below) — so
they agree.

The committed env files ship with `REDIS_PASSWORD=CHANGE_ME`. Generate a real
value per environment (use a **different** one for staging and prod):

```bash
openssl rand -hex 32
```

Put it in `REDIS_PASSWORD` in Infisical **before** starting Redis. To rotate it
later: change it in Infisical, redeploy the app in Jenkins, then straight away
repeat the export and `up -d` below. Compose sees the new password and
recreates Redis; queued jobs survive in its volume. Until Redis is recreated,
the app gets `WRONGPASS`.

---

## Staging: one-time setup

Redis is deliberately **not** in the Jenkinsfile — it's a long-lived container
that must survive app redeploys, so you bring it up by hand once. Redis reads
`.env.staging` only while `up` creates it, so the file is exported from
Infisical just for that and deleted afterwards; a copy left lying around would
go stale the first time a value changes in Infisical. On the server, as root:

```bash
# 0. The shared network must exist (created once for the whole staging stack):
docker network inspect ekoru-staging-network >/dev/null 2>&1 \
  || docker network create ekoru-staging-network

# 1. Log in to Infisical: the lines of infisical/README.md section 5.2 up to
#    `export INFISICAL_TOKEN` (they set IMAGE, RUN and the token).

# 2. Export the env (carries REDIS_PASSWORD), start Redis, delete the file:
cd /path/to/ekoru-users        # the folder with redis.staging.yml
( umask 077; $RUN -e INFISICAL_TOKEN -e INFISICAL_PROJECT_ID $IMAGE \
    sm export --env=staging --path=/ekoru-users --format=dotenv --expand=false --silent \
    > .env.staging )
if grep -q '^REDIS_PASSWORD=.' .env.staging; then docker compose -f redis.staging.yml up -d
else echo "The export has no REDIS_PASSWORD. Redis not started."; fi
shred -u .env.staging
unset INFISICAL_TOKEN INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET

# 3. Verify it's healthy and auth works (the password comes from the container):
docker ps --filter name=ekoru-users-redis-staging
docker exec ekoru-users-redis-staging \
  sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping'
#   → PONG
```

## Production: one-time setup

Identical, with `--env=prod`, `.env.prod`, `redis.prod.yml` and the prod
network. Log in first, as in step 1 above:

```bash
docker network inspect ekoru-network >/dev/null 2>&1 \
  || docker network create ekoru-network

cd /path/to/ekoru-users
( umask 077; $RUN -e INFISICAL_TOKEN -e INFISICAL_PROJECT_ID $IMAGE \
    sm export --env=prod --path=/ekoru-users --format=dotenv --expand=false --silent \
    > .env.prod )
if grep -q '^REDIS_PASSWORD=.' .env.prod; then docker compose -f redis.prod.yml up -d
else echo "The export has no REDIS_PASSWORD. Redis not started."; fi
shred -u .env.prod
unset INFISICAL_TOKEN INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET

docker ps --filter name=ekoru-users-redis
docker exec ekoru-users-redis \
  sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping'
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

The password is read inside the container, so nothing on the host needs it, and
the logs come from `docker logs` because the env file is gone after setup.

```bash
# Health
docker ps --filter name=ekoru-users-redis
docker logs -f ekoru-users-redis

# Queue depth (jobs waiting to be delivered)
docker exec ekoru-users-redis \
  sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning llen bull:notifications:wait'

# Memory
docker exec ekoru-users-redis \
  sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning info memory' | grep used_memory_human
```

A steadily growing `bull:notifications:wait` means the worker is not keeping up
or has crashed — check the app logs for `NotificationsProcessor`.
