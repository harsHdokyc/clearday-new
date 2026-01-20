# ClearDay – Your Skincare Habit Companion

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables for Supabase
# Create a .env file in the root directory with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key-here
# You can find these in your Supabase project dashboard: https://app.supabase.com/project/_/settings/api

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Authentication)

## Supabase Authentication Setup

This project uses Supabase for authentication. To set up:

1. **Create a Supabase project** at https://app.supabase.com
2. **Get your project credentials** from the project settings (API section)
3. **Create a `.env` file** in the root directory:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. **Set up the database schema** by running the migration in your Supabase SQL Editor:
   - Go to SQL Editor in your Supabase dashboard
   - Create a `profiles` table (the migration will be created automatically on first user signup, or you can create it manually)
   
The authentication system supports:
- Email/password sign up
- Email/password sign in
- Automatic session management
- User profile management

## How can I deploy this project?

Build the project with `npm run build` and deploy the `dist` folder to any static host (e.g. Vercel, Netlify, Cloudflare Pages, or your own server).
