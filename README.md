# Chilled And Frozen Hub

A premium web application for Chilled And Frozen Hub — a trusted Trader, Supplier, and Distributor of quality meats including beef, chicken, pork, seafood, and rice.

## Features
- **Dynamic Menu**: Real-time menu management with categories, variations, and add-ons.
- **Store Status**: Automatic and manual toggle for store opening/closing hours.
- **Order Management**: Checkout integration with Facebook Messenger for seamless ordering.
- **Admin Dashboard**: Full CRUD for menu items and categories, order history, and store settings.
- **Thermal Printing**: Built-in support for 57mm thermal receipts.
- **Responsive Design**: Fully optimized for mobile and desktop views.

## Tech Stack
- **Frontend**: React (Vite)
- **Database/Backend**: Supabase (Schema provided in `supabase_schema.sql`)
- **Icons**: Lucide React
- **Styling**: Vanilla CSS with modern aesthetics

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Locally:**
   ```bash
   npm run dev
   ```

3. **Database Setup:**
   - Create a project in Supabase.
   - Run the contents of `supabase_schema.sql` in the SQL Editor to set up the tables and initialize the seed data.
   - **Database Automation (Supabase pg_cron):**
     - Go to your Supabase project dashboard.
     - Go to **Database** -> **Extensions**.
     - Search for `pg_cron` and click toggle to enable it.
     - Once enabled, the SQL script automatically registers background tasks for:
       - Resetting daily order numbers sequence (Philippine Time).
       - Auto-canceling pending orders older than 12 hours.
       - Weekly deletion of cancelled/completed orders older than 30 days.
       - Daily auto-reset of store manual override status.
     - You can monitor or manage the active cron jobs by querying:
       ```sql
       SELECT * FROM cron.job;
       SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 50;
       ```

4. **Admin Access:**
   - Navigate to `/login` to access the administrative dashboard.
   - Manage store settings, hours, and menu items directly from the panel.

## Credits
Built with passion for quality in every bite.
