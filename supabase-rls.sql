-- Run this file in the Supabase SQL editor after enabling Clerk under
-- Authentication > Third-Party Auth.

alter table public.accounts enable row level security;
alter table public.resume_reviews enable row level security;

revoke all on table public.accounts from anon;
revoke all on table public.resume_reviews from anon;
grant select on table public.accounts to authenticated;
grant select on table public.resume_reviews to authenticated;
grant delete on table public.resume_reviews to authenticated;

drop policy if exists "Users can view their own account" on public.accounts;
create policy "Users can view their own account"
on public.accounts
for select
to authenticated
using (
  clerk_user_id = (select auth.jwt()->>'sub')
);

drop policy if exists "Users can view their own resume reviews"
on public.resume_reviews;
create policy "Users can view their own resume reviews"
on public.resume_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = resume_reviews.account_id
      and accounts.clerk_user_id = (select auth.jwt()->>'sub')
  )
);

drop policy if exists "Users can delete their own resume reviews"
on public.resume_reviews;
create policy "Users can delete their own resume reviews"
on public.resume_reviews
for delete
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = resume_reviews.account_id
      and accounts.clerk_user_id = (select auth.jwt()->>'sub')
  )
);

drop policy if exists "Users can download their own resumes"
on storage.objects;
create policy "Users can download their own resumes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'Resume''s'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

drop policy if exists "Users can delete their own resume files"
on storage.objects;
create policy "Users can delete their own resume files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'Resume''s'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);
