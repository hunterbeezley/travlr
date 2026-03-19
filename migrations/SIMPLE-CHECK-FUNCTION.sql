-- Simple check: Does get_user_feed function exist?

-- Method 1: Check pg_proc directly
SELECT
  proname as function_name,
  pronargs as num_args
FROM pg_proc
WHERE proname = 'get_user_feed';

-- Method 2: Try to describe the function
\df get_user_feed

-- Method 3: List all functions with 'feed' in the name
SELECT
  proname as function_name
FROM pg_proc
WHERE proname LIKE '%feed%'
ORDER BY proname;
