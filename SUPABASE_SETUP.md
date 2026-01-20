# Supabase Setup Instructions

## Database Setup

Run these SQL migrations in your Supabase SQL Editor:

### 1. Create Check-ins Table
Run the SQL from `supabase/migrations/001_create_check_ins.sql` in your Supabase SQL Editor.

This creates:
- `check_ins` table to store daily check-ins with 3 photo URLs
- Row Level Security policies
- Indexes for performance

### 2. Create Storage Bucket
Run the SQL from `supabase/migrations/002_create_storage_bucket.sql` in your Supabase SQL Editor.

Or manually create the bucket:
1. Go to Storage in Supabase Dashboard
2. Click "New bucket"
3. Name: `check-in-photos`
4. Public: Yes (or configure policies as needed)
5. Click "Create bucket"

### 3. Storage Policies
The migration includes storage policies, but you can also set them up manually:

1. Go to Storage → Policies
2. Select `check-in-photos` bucket
3. Add policies:
   - **INSERT**: Allow authenticated users to upload to their own folder
   - **SELECT**: Allow users to read their own photos
   - **UPDATE**: Allow users to update their own photos
   - **DELETE**: Allow users to delete their own photos

## Testing

After setup:
1. Log in to your app
2. Go to Dashboard
3. Upload 3 photos (front, right, left)
4. Check Supabase Storage to see uploaded files
5. Check `check_ins` table to see the database entry

## File Structure

Photos are stored in Supabase Storage with this structure:
```
check-in-photos/
  {user_id}/
    {date}/
      front.{ext}
      right.{ext}
      left.{ext}
```
