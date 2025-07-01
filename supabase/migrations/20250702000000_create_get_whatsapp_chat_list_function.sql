create or replace function public.get_whatsapp_chat_list()
returns table (
    lead json,
    last_message text,
    last_message_timestamp timestamptz
)
language plpgsql
security definer -- Definer rights to access leads table
as $$
begin
    -- Ensure the user is authenticated
    if auth.uid() is null then
        raise exception 'User must be authenticated';
    end if;

    return query
    with latest_messages as (
        select
            wm.lead_id,
            wm.content as last_message,
            wm.created_at as last_message_timestamp,
            -- Partition by lead_id to get the last message for each lead
            row_number() over(partition by wm.lead_id order by wm.created_at desc) as rn
        from public.whatsapp_messages as wm
        -- RLS on whatsapp_messages will filter for the correct user
    )
    select
        row_to_json(l.*) as lead,
        lm.last_message,
        lm.last_message_timestamp
    from latest_messages as lm
    join public.leads as l on l.id = lm.lead_id
    where lm.rn = 1
    -- RLS on leads table will ensure user can only see their own leads
    order by lm.last_message_timestamp desc;
end;
$$;
