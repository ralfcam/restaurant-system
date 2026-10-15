-- RES-117: hero cap 3MB must match MAX_HERO_BYTES.
-- The file name keeps the suffix from the original ticket brief.
-- The branding bucket was created at 2097152. Existing migrations stay
-- untouched; this forward-only UPDATE sets the live bucket to 3145728.
-- Re-running it sets the same limit.

UPDATE storage.buckets SET file_size_limit = 3145728 WHERE id = 'branding';
