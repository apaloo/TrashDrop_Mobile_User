# Instructions for Developing TrashDrop Mobile PWA

## Project Overview
TrashDrop is a community-focused waste management Progressive Web Application (PWA) designed to:
- Register trash bags via QR code scanning
- Request on-demand trash pickups
- Schedule recurring pickups
- Report illegal dumping
- Earn and redeem points for eco-friendly activities

The application is responsive, offline-capable, and user-friendly, leveraging modern web technologies. The database schema and tables already exist in Supabase under the "public" schema for the TrashDrop management web app, so these instructions utilize the current setup.

## Technology Stack
### Frontend
- **HTML5, CSS3, JavaScript (ES6+)**: For interactive UI
- **Bootstrap 5**: For responsive design
- **PWA Capabilities**: For offline support and installability

### Backend
- **Node.js v15 with Express.js**: For server-side logic

### Database & Authentication
- **Supabase**: For user data, authentication, and real-time updates

### Maps
- **Leaflet.js**: For interactive mapping

### QR Scanning
- **Html5QrcodeScanner**: For trash bag registration
- Chart.js: `https://cdn.jsdelivr.net/npm/chart.js@4.2.1/dist/chart.umd.min.js`
- Supabase Client: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js`
- Html5QrcodeScanner: `https://cdn.jsdelivr.net/npm/html5-qrcode/dist/html5-qrcode.min.js`

## Project Structure
```
/trashdrop-pwa
  /client
    /src
      /components
        Dashboard.js
        BagScanner.js
        PickupRequest.js
        ScheduledPickups.js
        ReportDumping.js
        LocationManager.js
        PointsAndRewards.js
        Profile.js
      /pages
        Onboarding.js
        Home.js
        Scanner.js
        Pickup.js
        Reports.js
        Rewards.js
        Settings.js
      /assets
        styles.css
      App.js
      index.js
    /public
      index.html
      manifest.json
      service-worker.js
      signup.html
      signin.html
      confirm.html
      reset-password.html
      /js
        auth.js
        scanner.js
        pickup-modal.js
        scheduled-pickups.js
        map-service.js
        reporter.js
        points-system.js
        notification.js
        emergency-logout.js
  /server
    /routes
      auth.js
      user.js
      pickup.js
      reports.js
      bags.js
      points.js
    /controllers
      authController.js
      userController.js
      pickupController.js
      reportsController.js
      bagsController.js
      pointsController.js
    /middleware
      authMiddleware.js
    /utils
      supabaseClient.js
      qrCodeScanner.js
      distanceCalculator.js
    index.js
  package.json
```

## Existing Database Schema in Supabase
The following tables exist in the "public" schema of the Supabase database for the TrashDrop web app:

### Tables and Columns
- **scanned_at**:
  - `created_at` (timestamp with time zone, not nullable)
- **pickup_requests**:
  - `id` (text, primary key, not nullable)
  - `location` (text, not nullable)
  - `coordinates` (geography, not nullable)
  - `fee` (int4, not nullable)
  - `status` (text, not nullable)
  - `collector_id` (uuid, nullable, foreign key to `auth.users.id`)
  - `accepted_at` (timestamp with time zone, nullable)
  - `disposed_at` (timestamp with time zone, nullable)
  - `created_at` (timestamp with time zone, not nullable)
  - `updated_at` (timestamp with time zone, not nullable)
- **fee_points**:
  - `id` (uuid, primary key, not nullable)
  - `points` (int4, not nullable)
  - `request_id` (text, nullable, foreign key to `pickup_requests.id`)
  - `created_at` (timestamp with time zone, not nullable)
  - `updated_at` (timestamp with time zone, not nullable)
- **profiles**:
  - `id` (uuid, primary key, not nullable)
  - `email` (text, not nullable)
  - `first_name` (text, not nullable)
  - `last_name` (text, not nullable)
  - `phone` (text, not nullable)
  - `address` (text, not nullable)
  - `avatar_url` (text, nullable)
  - `dark_mode` (bool, not nullable)
  - `language` (text, nullable)
  - `created_at` (timestamp with time zone, not nullable)
  - `updated_at` (timestamp with time zone, not nullable)
- **spatial_ref_sys**:
  - `srid` (integer, not nullable)
  - `auth_name` (varchar, not nullable)
  - `auth_srid` (integer, not nullable)
  - `srtext` (varchar, not nullable)
  - `proj4text` (varchar, not nullable)
- **disposal_centers**:
  - `id` (text, primary key, not nullable)
  - `name` (text, not nullable)
  - `coordinates` (geography, not nullable)
  - `address` (text, not nullable)
  - `created_at` (timestamp with time zone, not nullable)
  - `updated_at` (timestamp with time zone, not nullable)
- **authority_assignments**:
  - `id` (text, primary key, not nullable)
  - `location` (text, not nullable)
  - `coordinates` (geography, not nullable)
  - `type` (text, not nullable)
  - `priority` (text, not nullable)
  - `payment` (text, not nullable)
  - `estimated_time` (text, not nullable)
  - `distance` (text, not nullable)
  - `authority` (text, not nullable)
  - `status` (text, not nullable)
  - `collector_id` (text, not nullable)
  - `completed_at` (timestamp with time zone, not nullable)
  - `created_at` (timestamp with time zone, not nullable)
  - `authusers_id` (text, foreign key to `auth.users.id`, not nullable)
- **assignment_photos**:
  - `id` (text, primary key, not nullable)
  - `assignment_id` (text, foreign key to `authority_assignments.id`, not nullable)
  - `photo_url` (text, not nullable)
  - `created_at` (timestamp with time zone, not nullable)
- **bags**:
  - `id` (text, primary key, not nullable)
  - `request_id` (text, foreign key to `pickup_requests.id`, not nullable)
  - `type` (text, not nullable)
  - `scanned_at` (timestamp with time zone, not nullable)
  - `created_at` (timestamp with time zone, not nullable)

### Relationships
- `pickup_requests.collector_id` references `auth.users.id`
- `fee_points.request_id` references `pickup_requests.id`
- `authority_assignments.authusers_id` references `auth.users.id`
- `assignment_photos.assignment_id` references `authority_assignments.id`
- `bags.request_id` references `pickup_requests.id`

## Core Components Implementation
### 1. User Authentication & Account Management
- **Registration Flow**:
  - Insert new user data into the `profiles` table upon registration, ensuring all non-nullable fields (`email`, `first_name`, `last_name`, `phone`, `address`, `dark_mode`) are provided.
  - Example:
    ```javascript
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id, // From auth.users
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '123-456-7890',
        address: '123 Green St',
        dark_mode: false
      });
    ```
- **Authentication**:
  - Use Supabase's authentication system, linking operations to `auth.users.id`.
  - Ensure user-specific actions (e.g., creating pickup requests) use the authenticated user's ID.

### 2. Main Dashboard
- **Features**:
  - Display stats by querying tables like `bags` (count of scanned bags) and `pickup_requests` (active/completed requests).
  - Example:
    ```javascript
    const { data: activeRequests } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'pending');
    ```

### 3. Location Management System
- **Features**:
  - Use the `disposal_centers` table to manage disposal locations, ensuring `coordinates` are in the `geography` format.
  - Example:
    ```javascript
    const { data } = await supabase
      .from('disposal_centers')
      .select('name, coordinates, address');
    ```

### 4. Pickup Request System
- **On-Demand Pickup**:
  - Insert new requests into `pickup_requests`, providing required fields.
  - Example:
    ```javascript
    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        id: 'unique-id',
        location: '123 Green St',
        coordinates: 'POINT(-73.935242 40.730610)',
        fee: 5,
        status: 'pending',
        collector_id: null, // Assigned later
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    ```
  - Update status:
    ```javascript
    const { data } = await supabase
      .from('pickup_requests')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', 'request-id');
    ```
- **Scheduled Pickups**:
  - If managed within `pickup_requests`, filter by recurring logic or add a custom field (requires schema update approval).

### 5. Scanning & Bag Management
- **Features**:
  - Insert scanned bags into the `bags` table, linking to `pickup_requests`.
  - Example:
    ```javascript
    const { data } = await supabase
      .from('bags')
      .insert({
        id: 'bag-id',
        request_id: 'request-id',
        type: 'trash',
        scanned_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    ```

### 6. Illegal Dumping Reports
- **Features**:
  - Use `authority_assignments` for reports, inserting new records.
  - Example:
    ```javascript
    const { data } = await supabase
      .from('authority_assignments')
      .insert({
        id: 'assignment-id',
        location: '456 Red St',
        coordinates: 'POINT(-73.935242 40.730610)',
        type: 'dumping',
        priority: 'high',
        payment: '10',
        estimated_time: '2h',
        distance: '5km',
        authority: 'local',
        status: 'pending',
        collector_id: 'collector-id',
        authusers_id: user.id,
        completed_at: null,
        created_at: new Date().toISOString()
      });
    ```
  - Add photos to `assignment_photos`:
    ```javascript
    const { data } = await supabase
      .from('assignment_photos')
      .insert({
        id: 'photo-id',
        assignment_id: 'assignment-id',
        photo_url: 'https://example.com/photo.jpg',
        created_at: new Date().toISOString()
      });
    ```

### 7. Points & Rewards System
- **Features**:
  - Manage points in `fee_points`, linking to completed requests.
  - Example:
    ```javascript
    const { data } = await supabase
      .from('fee_points')
      .insert({
        id: 'point-id',
        points: 10,
        request_id: 'request-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    ```

### 8. Profile & Settings
- **Features**:
  - Update user data in `profiles`.
  - Example:
    ```javascript
    const { data } = await supabase
      .from('profiles')
      .update({ first_name: 'Jane', updated_at: new Date().toISOString() })
      .eq('id', user.id);
    ```

### 9. Offline Support & Performance
- **Features**:
  - Cache data from `pickup_requests` and `bags` using service workers.
  - Sync offline actions (e.g., new pickup requests) when online.

## Development Workflow
### Setup Phase
- Connect to the existing Supabase project, referencing the "public" schema.
- Verify table access and relationships.

### Implementation Phase
- Build features using existing tables (e.g., insert into `bags`, update `pickup_requests`).
- Respect foreign keys and constraints.

### Testing Phase
- Test CRUD operations on all tables.
- Validate relationship integrity (e.g., `bags.request_id` matches `pickup_requests.id`).

### Deployment Phase
- Deploy with live Supabase database connectivity.
- Monitor database interactions for performance.

## Security Considerations
- Use Supabase Auth with JWT for secure access.
- Restrict data access with row-level security policies.
- Sanitize inputs to prevent injection.
- Limit CORS to trusted origins.
- Implement emergency logout by clearing sessions.

## Additional Notes
- Align UI with existing design standards.
- Ensure responsiveness and accessibility.
- Prioritize offline functionality.
- Provide clear error handling and user feedback.

