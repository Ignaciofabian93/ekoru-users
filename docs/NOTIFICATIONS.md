# Notifications — users subgraph

> Every notification the platform sends goes through this subgraph. Other
> services report *that something happened*; this service decides what — if
> anything — reaches the user, and through which channel.
>
> Redis/queue setup: [`REDIS_SETUP.md`](./REDIS_SETUP.md)

Code: [`src/notifications/`](../src/notifications/) · [`src/mail/templates/`](../src/mail/templates/)

---

## 1. Why it lives here

The decision to send depends on `SellerPreferences`, and the content depends on
`NotificationTemplate` and the seller's `contentLanguage` — all of which are in
this database, alongside the seller's email and display name. A separate
notifications service would need a network round trip for every preference
check, and the gateway can't do it at all (its Prisma schema is a curated
subset with no `SellerPreferences`).

Delivery fan-out is I/O-bound (a DB write plus two HTTP calls), so it does not
warrant its own runtime. What makes it scalable is the **seam**, not the
deployment unit — see §3.

---

## 2. The three channels

| Channel | Gate | Reach |
|---|---|---|
| **In-app feed** (`Notification` row) | none — **always written** | web + mobile |
| **Email** | `enableEmailNotifications`, or `enableLoginAlerts` for security types | anywhere |
| **Mobile push** (Expo → APNs/FCM) | `enablePushNotifications` | iOS + Android app |

The in-app row is deliberately ungated: a user who muted email still needs to
see "action required" when they open the app.

Both preference columns default to `false`, and a seller with **no**
`SellerPreferences` row is treated the same way — opted out until they opt in.
So a fresh account gets in-app only.

Web push (service workers) is deliberately **not** implemented: Safari only
supports it for home-screen-installed PWAs, and the in-app bell covers the same
need on the web.

---

## 3. The seam

```ts
notifications.emit({ sellerId, type, relatedId, actionUrl, data });
```

One entry point for every domain event. `emit()`:

1. checks the account is active, resolves the seller's locale
2. resolves `data.actorSellerId` → `data.actorName` (the other person in the event)
3. renders the in-app title/message (§4)
4. **writes the `Notification` row synchronously** — the feed is correct the
   instant the mutation returns
5. queues delivery on BullMQ and returns the notification id

Everything slow (SMTP, Expo) happens in
[`notifications.processor.ts`](../src/notifications/notifications.processor.ts).
That split is the point: a channel outage can't touch request latency, retries
come from the queue with exponential backoff, and the worker can move to its own
container later **without a single caller changing**.

If Redis is unreachable, `emit()` still records the notification and logs that
delivery could not be queued — it degrades to in-app only rather than failing.

`emit()` never throws. A notification is a side effect of the caller's real
work; a completed order must stay completed even if nobody could be reached.

### Over the wire

Callers use the internal mutation, guarded by `INTERNAL_SERVICE_SECRET` the same
way `awardPoints` is:

```graphql
mutation { emitNotification(input: { ... }, internalSecret: "...") }
```

`input.data` is untyped JSON on purpose — it fills `{{placeholders}}` in the
in-app copy *and* carries the richer fields the HTML emails need, and those
differ per type. Type safety lives one level up, in each caller's typed client:

| Caller | Client | Methods |
|---|---|---|
| ekoru-gateway | `src/mail/notifications.client.ts` | `sendLoginAlert` |
| ekoru-transactions | `src/common/clients/users.client.ts` | `notifyTransaction`, `notifyDealOffer` |

---

## 4. Copy: what is admin-editable and what is not

**In-app title/message — editable.** Resolved in this order by
[`notification-renderer.ts`](../src/notifications/notification-renderer.ts):

1. `NotificationTemplateTranslation` for the seller's language
2. `NotificationTemplate` base copy
3. the code fallback in [`notification-registry.ts`](../src/notifications/notification-registry.ts)

Steps 1–2 are what admins edit in the panel, using `{{placeholder}}` syntax
filled from the emit payload. Unknown placeholders collapse to nothing rather
than leaking `{{note}}` to a user. Templates are cached in memory for 60s.

> **After editing a template in the admin panel**, call
> `NotificationRenderer.invalidate()` or wait out the 60s cache.

**HTML emails — in code.** [`src/mail/templates/`](../src/mail/templates/).
They are 200-line documents with conditional blocks and escaping; putting that
in a DB textarea means no review, no tests, and one typo breaking rendering for
everyone. Email HTML is code, not content.

**Security emails — never editable, by design.** `SECURITY_TYPES` in the
registry makes the renderer skip the template lookup entirely. An admin-editable
security email with editable links is a phishing vector that would send from our
own domain with our own branding.

---

## 5. Adding a notification

One file. Add a row to `NOTIFICATION_REGISTRY`:

```ts
[NotificationType.REVIEW_RECEIVED]: {
  ...DEFAULTS,
  priority: NotificationPriority.MEDIUM,
  email: 'transaction',        // omit for in-app + push only
  fallback: { es: {...}, en: {...}, fr: {...} },
},
```

…then call `emit()`. Nothing else needs to know about channels or gating. Types
**absent** from the registry still work — they fall back to in-app + push with
generic copy — so a new `NotificationType` can never crash `emit()`.

---

## 6. Devices (push)

The mobile app registers its Expo token on launch and drops it on sign-out:

```graphql
mutation { registerDevice(input: { pushToken: "...", platform: ANDROID }) { id } }
mutation { unregisterDevice(pushToken: "...") }
```

`SellerDevice.pushToken` is **unique platform-wide**, not per seller: Expo hands
the same token to whichever install currently owns it. Registering an existing
token therefore *moves* it to the calling seller — that is what happens when two
people share a phone. Getting this wrong sends one user's notifications to
another.

[`push.channel.ts`](../src/notifications/channels/push.channel.ts) deactivates
any token Expo reports as `DeviceNotRegistered`, so the dead-token set doesn't
grow forever.

---

## 7. Client API (feed)

```graphql
query { myNotifications(page: 1, pageSize: 20, onlyUnread: false) { nodes { ... } pageInfo { ... } } }
query { unreadNotificationCount }          # bell badge
mutation { markNotificationRead(id: 42) }
mutation { markAllNotificationsRead }
query { myDevices { id platform deviceName lastSeenAt } }
```

`markNotificationRead` is scoped to the caller, so a guessed id is a no-op
rather than an error.
