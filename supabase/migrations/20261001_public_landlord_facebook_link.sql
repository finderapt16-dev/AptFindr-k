CREATE OR REPLACE FUNCTION public.fn_get_public_landlord_facebook_link(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(BTRIM(preferences->'landlordProfile'->>'facebookLink'), '')
  FROM public.app_users
  WHERE id = p_user_id
    AND role = 'landlord'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_get_public_landlord_facebook_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_public_landlord_facebook_link(uuid) TO anon, authenticated;