# Last Seen Migration

## Instructions

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `add_last_seen.sql`
3. This will add `last_seen` column to track user activity

## What it does

- Adds `last_seen` TIMESTAMP column to `recipients` table
- Creates index for better query performance
- Tracks when users last accessed their claim page

## How it works

- Frontend sends heartbeat every 10 seconds when user is on claim page
- Backend updates `last_seen` timestamp
- Admin panel shows:
  - 🟢 "متصل الآن" if last seen < 30 seconds ago
  - 🟡 "منذ X دقيقة/ساعة" for recent activity
  - ⚪ "لم يتصل بعد" if never connected
