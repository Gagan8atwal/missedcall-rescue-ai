# MissedCall Rescue → Pivot consolidation contract

Status: **MAINTENANCE ONLY — no new standalone product development**

Exact standalone source frozen for extraction:
- repository: `Gagan8atwal/missedcall-rescue-ai`
- base: `main@b958071364de234e4963103590ae9f6e7d631868`
- base tree: `6ef311e9243e8b8aca8cf4c8f8a9d1494c9d46d3`

Canonical destination: **Pivot AI**, primarily `Gagan8atwal/ai-receptionist-voice` plus its customer dashboard where owner-visible recovery outcomes belong.

Reusable capability inventory from this frozen source:
- `src/app/api/webhooks/twilio/route.ts` — missed-call/webhook entry logic.
- `src/lib/openai/qualify.ts` — qualification behavior to adapt behind Pivot's current conversation/runtime contract.
- `src/lib/twilio/sms.ts` — recovery-message transport adapter; carrier/provider truth remains external.
- `src/app/api/leads/*` and `src/components/leads/*` — lead/recovery result semantics and owner views.
- `src/app/api/businesses/route.ts` and `src/components/settings/BusinessSettingsForm.tsx` — business-level recovery configuration semantics.
- Supabase schema/seed files are reference material only; do not create a second Pivot datastore from them.

Migration finish line:
missed call → compliant immediate recovery → qualification/booking handoff → Pivot owner-visible lead/result → retry/audit evidence.

Rules:
1. Do not deploy or extend this standalone app.
2. Do not create a second telephony, auth, database, dashboard, lead or messaging stack.
3. Port only behavior that is missing from Pivot; preserve Pivot tenant identity, booking truth, provider truth and audit controls.
4. Keep provider/carrier actions fail-closed and explicit. No implied number purchase, SMS delivery or booking.
5. Delete/retire standalone runtime authority only after Pivot exact-runtime regression proves the migrated module.
6. This file is a source-maintenance contract, not proof that migration has already executed.
