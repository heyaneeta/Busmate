# BUSMATE

BUSMATE is a modern, real-time bus tracking and management application designed to streamline transportation logistics for educational institutions. It provides distinct interfaces and functionalities for students, drivers, and administrators.

## Key Features

- **Real-Time Tracking:** Live location monitoring for buses.
- **Role-Based Access:** Dedicated dashboards for:
    - **Students:** Track assigned buses and report issues.
    - **Drivers:** Manage routes and report bus status.
    - **Admins:** Full system management, including user, bus, route, and assignment management.
- **Issue Reporting:** Integrated system for reporting and resolving transit-related issues.
- **Notifications:** Broadcast system for important updates.
- **System Management:** Tools for data management and system resets.

## Tech Stack

- **Frontend:** React (TypeScript), Vite, Tailwind CSS
- **Backend/Database:** Firebase (Firestore, Authentication)
- **Icons:** Lucide React
- **Animations:** Motion (framer-motion)

## Getting Started

1. **Prerequisites:**
   - Node.js installed
   - A Firebase project configured

2. **Installation:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   - Create a `firebase-applet-config.json` file in the root directory with your Firebase configuration.

4. **Development:**
   ```bash
   npm run dev
   ```

5. **Build:**
   ```bash
   npm run build
   ```
