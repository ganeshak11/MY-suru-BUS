# Deployment Instructions

## Supabase

1.  **Create a Supabase Project:** Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Database Schema:** Go to the SQL Editor in your Supabase project and paste the content of `supabase/schema.sql`. Run the query to create the database tables.
3.  **Get API Keys:** In your Supabase project settings, go to the API section and find your Project URL and `anon` public key.

## Environment Variables

You will need to create a `.env.local` file in the `admin-dashboard` directory and a `.env` file in both the `driver-app` and `passenger-app` directories.

### Admin Dashboard (`admin-dashboard/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Driver App (`driver-app/.env`)

```
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Passenger App (`passenger-app/.env`)

```
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with the values from your Supabase project.

## Installation

Run `npm install` in each of the app directories:

```bash
npm install --prefix admin-dashboard
npm install --prefix driver-app
npm install --prefix passenger-app
```

## Running the Apps

### Admin Dashboard

```bash
cd admin-dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Driver App

```bash
cd driver-app
npm start
```

This will open the Expo developer tools. You can then run the app on an Android or iOS simulator, or on a physical device using the Expo Go app.

### Passenger App

```bash
cd passenger-app
npm start
```

This will open the Expo developer tools. You can then run the app on an Android or iOS simulator, or on a physical device using the Expo Go app.

## Hosting

### Admin Dashboard (Vercel)

1.  Push your project to a Git repository (e.g., GitHub).
2.  Go to [vercel.com](https://vercel.com) and create a new project.
3.  Import your Git repository.
4.  Vercel will automatically detect that it is a Next.js app. Set the root directory to `admin-dashboard`.
5.  Add your Supabase environment variables in the project settings.
6.  Deploy!

### Mobile Apps (Expo)

You can build and deploy your apps to the Apple App Store and Google Play Store using Expo's build service (`eas build`).

1.  Install the EAS CLI: `npm install -g eas-cli`
2.  Login to your Expo account: `eas login`
3.  Configure your project: `eas configure`
4.  Build your app: `eas build --platform all`
5.  Submit your app to the stores: `eas submit --platform all`
