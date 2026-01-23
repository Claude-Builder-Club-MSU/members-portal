-- Drop all existing policies on public.events
drop policy if exists "events_select_authenticated" on public.events;
drop policy if exists "events_select_public" on public.events;
drop policy if exists "events_update_creator" on public.events;
drop policy if exists "Board and Above Can Update All Events" on public.events;
drop policy if exists "events_delete_creator" on public.events;
drop policy if exists "Board and Above Can Delete Any Event" on public.events;
drop policy if exists "events_insert_authenticated" on public.events;
drop policy if exists "Board and Above Can Insert Events" on public.events;

-- ALL ENCOMPASSING: Board and E-Board can manage all events (select, insert, update, delete)
create policy "Board and Above Can Manage Events" on public.events
  for all
  using (
    auth.role() = 'board'
    or auth.role() = 'e-board'
  )
  with check (
    auth.role() = 'board'
    or auth.role() = 'e-board'
  );

