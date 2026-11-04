# Normalized fitness storage

`202611040001_fitness.sql` defines the account tables, owner-scoped RLS, ownership-aware foreign keys, atomic save/load RPCs, optimistic revisions and recent-auth account deletion.

No migration has been applied to a hosted database by this change. Confirm the intended Supabase project through the connected integration before applying it. The migration creates new named tables and fails on conflicting existing names; it does not replace an existing backend. Configure public URL/publishable key directly through secure project settings, never in chat.

`lib/database.test.ts` applies this SQL to local PostgreSQL (PGlite) with simulated Supabase roles and verifies actual PostgreSQL RLS and transaction behavior. Hosted auth/session delivery and two-user verification are still required after activation.

`../schema.sql` belongs only to the preserved `/prototype` tracker. Do not apply that legacy JSON-backup schema as a substitute for this migration. See the root README for activation steps.
