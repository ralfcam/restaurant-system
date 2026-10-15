-- RES-117: hero cap 5MB must match MAX_HERO_BYTES.
-- The branding bucket was created at 2097152. Existing migrations stay
-- untouched; this forward-only UPDATE raises the live bucket to 5242880.
-- Re-running it sets the same limit.

UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id = 'branding';
