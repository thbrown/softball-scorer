# Web app for tracking softball scores.

## Usage:

1. Clone this repo.
2. Install node.js (8.10.0+) and npm (5.6.0+). Older versions *might* work too.
3. From this repo's root directory, run `npm install`.
4. To run the application against a running postgres db (see schema directory for db dump), from the root directory:  
  `npm run build && node src-srv <postgres_url> <postgres_username> <postgres_password>`.  
   To run the aplication without a db connection (using browser's local storage only), from the root directory:  
  `npm run build && node src-srv`.
5. Visit http://localhost:8888 in your browser.