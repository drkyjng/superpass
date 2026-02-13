# HKU MBBS OSCE Clerked Cases (Invite-only)

Mobile-friendly light-grey web app to record clerked cases, with folder browsing:
- MED → CARD/RESP/ABDO/NEUR/SPOT
- SUR → PRS/VAS/ABDO/H&N/ECS/BR/ORTH

Cases are grouped/sorted by Ward, then:
- Current admissions (no discharge date) first
- Discharged cases at the end
- Chronological by Date of Admission (ascending)

## Tech
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth)

## 1) Create a Supabase project
1. Create a new Supabase project.
2. In **Authentication → Providers**: enable **Email** and **Google**.
3. In **Authentication → Settings**:
   - Recommended: **Disable public signups** (invite-only).
   - Ensure email confirmations behave as you want for your cohort.
4. In **SQL Editor**, run: `supabase/migrations/001_init.sql`

### Invite-only flow (recommended)
If public signups are disabled:
- Use **Auth → Users → Invite user** in Supabase dashboard to invite editors.
- Invited users receive an email to set password.
- Google sign-in works if you enable Google provider; Supabase can link identities by email depending on your project settings.

## 2) Configure environment variables
Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 3) Run locally
```bash
npm install
npm run dev
```

Then open http://localhost:3000

## 4) Deploy
- Push this repo to GitHub.
- Connect to Vercel (recommended) or Netlify.
- Add the same env vars in the host dashboard.

## Notes
- All authenticated users can view and update any case.
- Only the creator can delete a case.
