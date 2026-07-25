# LG Commercial Laundry API — Access Request

Use this to request official API access from LG so the POS can read live machine
status and cycle data. Fill in every `[...]` placeholder, then either email it to
your LG distributor / account manager, or submit it through the LG ThinQ
Developer site.

- **Where to apply:** https://thinq.developer.lge.com → Commercial Laundry
  (register as a business/partner using the same LG business account behind your
  "Laundry Crew Manager" login).
- **Your portal identifiers (from your login URL):** `biz_code = B01004C037.01`,
  `country = PH`.

---

## Information to have ready before applying

- [ ] Registered business / company name and address
- [ ] LG business account email (the one used on Laundry Crew Manager)
- [ ] Business account / customer number with LG (if you have one)
- [ ] Number and models of LG commercial washers/dryers on the account
- [ ] Technical contact name + email (the person who will receive the credentials)

---

## Email version (send to your LG distributor / account manager)

**Subject:** Request for Commercial Laundry API access — [Business Name] (LG biz account [account email])

Hello [LG contact name / LG Commercial Laundry team],

We operate [Business Name], a laundry business in the Philippines running LG
commercial washers and dryers registered under our LG business account
([account email]). We currently monitor these machines through the Laundry Crew
Manager portal (biz_code B01004C037.01, country PH).

We are building an in-house Point-of-Sale system for our shop and would like to
display each machine's live status and cycle information inside it. To do this
properly, we would like to request access to the **LG ThinQ Commercial Laundry
API** for our account.

Specifically, we would like:

1. **Partner API credentials** (Client ID / Client Secret, or the equivalent
   token) for our business account.
2. The **Commercial Laundry API documentation** and base URL / endpoints for the
   Philippines region.
3. The **device IDs** of the machines registered to our account (or how to
   retrieve them via the Device API).
4. Any **onboarding steps, agreements, or approvals** we need to complete.

Our intended use is **read-only monitoring** of our own machines — run state
(running / idle / finished), remaining cycle time, and cycle counts — to show
availability to our staff. We are not requesting remote control of the machines.

Could you let us know the process to obtain this access, any requirements on our
side, and whether there are costs involved?

Technical contact: [Technical contact name], [technical email], [phone].

Thank you very much,
[Your name]
[Business Name]
[Phone] · [email]

---

## Short version (for an online application / support form)

> We operate LG commercial laundry machines registered to our LG business
> account [account email] (Laundry Crew Manager, biz_code B01004C037.01, country
> PH). We request access to the Commercial Laundry API to display our own
> machines' status and cycle data (read-only) inside our in-house POS. Please
> advise on credentials (Client ID/Secret), API documentation, device IDs for
> our account, and any onboarding steps or costs. Technical contact:
> [name, email, phone].

---

## What happens after LG grants access

Send the credentials + docs to your developer and they will:
1. Store the Client ID/Secret **server-side** (in a small backend — not in the
   browser).
2. Wire the backend to LG's Device API to pull each machine's live status.
3. Replace the demo/simulated data in the POS with the real feed — the
   Auto/Manual toggle and machine mapping are already built and waiting.
