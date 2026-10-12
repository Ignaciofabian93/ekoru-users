# Eco-points

How people earn points on Ekoru, and why each activity is worth what it is.
Built 2026-10-09. Values live in `PointsByTransactionKind` (panel:
Gamification → Transaction points) and are seeded by
`catalogs/gamification/01-points.sql`.

## The rule

Points reward things people **did**, not things they intended: a completed
purchase, a repair that happened, an event someone actually attended. Nothing is
earned for listing, booking, registering for an event or adding to a cart.

Every award is

```
points = base + min(cap, round(co2 kg × pointsPerKgCo2 + water m³ × pointsPerCubicMeterWater))
```

- **Base** (`pointsAwarded`) pays for doing the activity.
- **Impact** pays for what it saved, using the same CO2 and water figures the
  product pages show. A sofa kept in use earns more than a T-shirt, which is what
  "points equivalent to what they achieve" means here.
- **Cap** (`maxImpactPoints`) keeps one very large item from outweighing months
  of activity.

## What each activity earns

| Activity | Kind | Who | Base | Impact | Cap |
|---|---|---|---|---|---|
| Create an account | REGISTRATION | the new account | 10 | — | — |
| Buy second-hand (P2P sale or checkout) | PURCHASE | buyer | 20 | 1 per kg CO2, 1 per m³ water | 100 |
| Sell an item that stays in use | SELL | seller | 15 | 0.5 per kg CO2, 0.5 per m³ water | 50 |
| Swap items | EXCHANGE | each side | 30 | 1 per kg CO2, 1 per m³ water, for the item received | 100 |
| Buy from a sustainable store | STOREPURCHASE | buyer | 10 | none yet | — |
| Repair or maintenance service completed | REPAIR | client | 30 | — | — |
| Waste management service completed | RECYCLE | client | 20 | — | — |
| Class, workshop or talk completed | ATTENDTOWORKSHOP | client | 15 | — | — |
| Any other sustainable service completed | SERVICE | client | 10 | — | — |
| Provide a service that was completed | PROVIDESERVICE | provider | 10 | — | — |
| Attend a community event | ATTENDTOEVENT | attendee | 10 | — | — |
| Host an event people attended | ORGANIZEEVENT | organiser, per attendee | 3 | — | 40 attendees per event |
| Admin grant or deduction | BONUS | anyone | set when granting | — | — |

Why these numbers:
- **Second-hand is worth the most** because it avoids making something new. The
  buyer gets the full impact rate. The seller gets half, because both are
  credited for the same item.
- **Swapping pays the highest base**: no money changes hands and two items stay
  in use. Each side is credited for the item it received.
- **Repair is the best-paid service**. Repair keeps something in use instead of
  replacing it, which is the same saving as buying second-hand.
- **Store purchases earn the base only.** Material figures mean "saved by
  keeping an item in use", which overstates a new product. They get impact
  points once decision D3 settles how to label store impact.
- **Some activities have no impact figures yet**: services, events and
  registration. They earn a flat amount sized against a typical second-hand
  purchase, which comes to about 30 points.

Example: a cotton jacket (about 3.8 kg CO2 and 7,000 L of water) bought
second-hand earns the buyer 20 + 11 = 31 points and the seller 15 + 5 = 20.

## Levels and labels

Levels (seeded by `catalogs/gamification/02-levels.sql`):

| Level | From |
|---|---|
| Semilla (Seed) | 0 |
| Brote (Sprout) | 150 |
| Raíz (Root) | 500 |
| Árbol (Tree) | 1,500 |
| Bosque (Forest) | 4,000 |

Two second-hand purchases a month earn about 60 points. A regular buyer reaches
Brote in under three months and Raíz within the year. Active sellers, repairers
and organisers climb faster.

Labels are badges for doing an activity a number of times, for example
Reparador after 3 repairs. They are seeded by `03-labels.sql` and editable in
the panel (Gamification → Seller labels). A label is granted as soon as the
seller's count of that kind reaches `transactionsRequired`.

The seller is notified when they reach a level (LEVEL_REACHED) or earn a label
(LABEL_ACHIEVED). Both are in-app and push only, with no email.

## How it works

- **One engine:** `src/points/points.service.ts` `PointsService.award`. Other
  services call the internal mutation `awardActivityPoints(sellerId, kind,
  reference, co2SavingsKG?, waterSavingsLT?)`, guarded by
  `INTERNAL_SERVICE_SECRET`.
- **Once per thing:** every award is a `PointsAward` row, unique per seller and
  `reference` (`order:12`, `deal:4`, `booking:9`, `quotation:3`,
  `event-registration:7`, `event-attendee:7`, `registration`,
  `admin-grant:<uuid>`). A retried or repeated event pays nothing more.
- **History:** sellers read their own with `myPointsHistory(page, pageSize)`.
  Each entry carries the base points, the impact points and the CO2 and water
  figures.
- **Levels** are recomputed after every award, and can go down after an admin
  deduction without a notification.

Where each activity is reported:

| Activity | Service | When |
|---|---|---|
| REGISTRATION | ekoru-users | sign-up |
| PURCHASE, SELL, EXCHANGE (P2P) | ekoru-transactions `marketplace-deals` | deal completed; impact from the frozen `SellerImpactRecord` rows |
| PURCHASE / STOREPURCHASE, SELL (checkout) | ekoru-transactions `orders` | order marked DELIVERED while PAID; impact of marketplace items × quantity |
| REPAIR, RECYCLE, ATTENDTOWORKSHOP, SERVICE, PROVIDESERVICE | ekoru-services `common/service-points.ts` | booking or quotation COMPLETED; the kind comes from the service's department |
| ATTENDTOEVENT, ORGANIZEEVENT | ekoru-blog-community | the organiser confirms attendance (`setEventAttendance`) |
| BONUS | ekoru-users | admin `addPoints` / `deductPoints` |

Service departments map to kinds by their Spanish slug. Repair: reparacion,
reparacion-de-electrodomesticos, reparacion-de-electronica-y-tecnologia,
oficios-y-mantencion-del-hogar, vehiculos-y-mecanica,
bicicletas-y-micromovilidad. Recycle: gestion-de-residuos. Workshop:
clases-y-talleres, charlas-y-capacitaciones. Everything else is SERVICE.

## Guards against farming

- **Points go to the parties**, never to whoever reports the event. Marking
  someone else's order delivered earns the marker nothing.
- **Only a PAID order earns.** Each order, deal, booking, quotation and
  registration pays once.
- **Self-dealing earns nothing:** no points when a provider books their own
  service, or an organiser marks their own attendance.
- **Only attendees with an account earn.** Guests registered by email earn
  nothing, and an organiser earns for at most 40 attendees per event.
- **Attendance has a window.** It can be confirmed from the event's start until
  30 days after it, and never on a cancelled event.
- **Known gap:** someone with two accounts can still trade or book with
  themselves. A per-day cap per activity is the next step if that shows up.
  Points are not taken back after a refund or return.
