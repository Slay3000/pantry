Pantry Manager
Pantry Manager is a barcode‑powered pantry inventory application built with React and Supabase.
It helps users add, remove, organize, and track food items using barcode scanning, product auto‑fill, expiration dates, and grouped item display.

Features
Barcode Scanning
Scan barcodes to add items.
Scan barcodes to remove items in remove mode.
Automatically fills product data using:
Previously added items from your database.
OpenFoodFacts as a fallback.
Add and Remove Modes
Add Mode: Add items manually or by barcode scanning.
Remove Mode: Scan a barcode to remove one matching item from inventory.
Product Grouping
Items sharing the same barcode (or product name if barcode is missing) are grouped into a single card in the UI.

Example:

Milk (3 units)

- Expires: 2026-05-12
- Expires: 2026-05-15
- Expires: 2026-05-20
  Expiration Tracking
  Sorted by soonest expiration.
  Color‑coded expiration states:
  expired
  expiring soon
  expiring this week
  fresh
  Collapsible list of expiration dates per product.
  Category Support
  Category auto‑detected from OpenFoodFacts.
  Category can be manually edited.
  Displayed in grouped product cards.
  Future‑ready for a separate categories table.
  Inline Editing
  Edit expiration date per unit.
  Delete individual units.
  Product image, name, and category persist across units.
  Modern UI / UX
  Two‑tab interface:
  Add / Remove products
  Pantry item list
  Clean, readable light theme.
  Responsive layout that works well on mobile and desktop.
  Tech Stack
  Layer Technology
  Frontend React (Create React App)
  Backend Supabase (Postgres, Auth, REST)
  Scanning ZXing Browser
  Image Upload imgBB API
  Product Data OpenFoodFacts API
  Styling Custom CSS
  Installation
  Clone the repository:

git clone https://github.com/<your-username>/<your-repo>.git
cd your-repo
Install dependencies:

npm install
Create a .env file:

REACT_APP_SUPABASE_URL="https://<your-project>.supabase.co"
REACT_APP_SUPABASE_ANON_KEY="<your-key>"
REACT_APP_IMGBB_API_KEY="<your-imgbb-key>"
Running the Application
Development mode:

npm start
The app will run at:

http://localhost:3000/
Build production version:

npm run build
Database Schema (Model A)
The application uses one row per unit. No unit‑child table exists.

pantry_items table

id uuid primary key
pantry_id uuid (foreign key)
name text
category text
barcode text
image_url text
image_id text
delete_url text
expiration_date date
quantity integer default 1
created_at timestamptz default now()
This table is all the application needs for storing items.

Development Notes
Barcode scanning works through the user's camera via ZXing.
Expiration dates are stored in ISO format.
Items are grouped in the UI based on barcode (or name).
All grouping and sorting is performed client‑side.
Item removal deletes only a single matching row.
Editing changes only the selected unit.
Future Improvements
This project is designed to support later enhancements such as:

Standalone categories table.
Inventory analytics.
Offline support through IndexedDB.
Enhanced search and filtering.
Push notifications for upcoming expirations.
License
This project is licensed under the MIT License.

Copyright © 2026 Vasyl
