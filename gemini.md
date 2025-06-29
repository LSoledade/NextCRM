# Project Overview: NextCRM

This project is a Next.js application, likely a CRM (Customer Relationship Management) system, built with TypeScript and styled using Tailwind CSS. It leverages Radix UI for accessible and customizable UI components, and Material-UI for additional components. Supabase is used for backend services, including authentication.

## Technologies Used

- **Framework**: Next.js (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Radix UI, Material-UI
- **Backend/Database**: Supabase
- **State Management/Data Fetching**: React Query (Tanstack Query)
- **Form Management**: React Hook Form with Zod for validation
- **UI Components**: Radix UI, Material-UI, Shadcn UI (implied by `components.json` and `components/ui`)
- **Linting**: ESLint (Next.js configuration)

## Project Structure

- `app/`: Contains the main Next.js application pages and layout.
  - `app/dashboard/`: Dashboard page.
  - `app/leads/`: Leads management pages, including dynamic routing for individual leads (`[id]`).
  - `app/login/`: Login page.
  - `app/tasks/`: Tasks management page.
- `components/`: Reusable React components.
  - `components/Layout/`: Application layout components (e.g., `AppLayout.tsx`).
  - `components/Leads/`: Components specific to the leads feature (e.g., `LeadTable.tsx`, `LeadDialog.tsx`).
  - `components/ui/`: Shadcn UI components (e.g., `button.tsx`, `dialog.tsx`).
- `contexts/`: React Context API providers (e.g., `AuthContext.tsx`).
- `hooks/`: Custom React hooks (e.g., `use-toast.ts`).
- `lib/`: Utility functions and configurations (e.g., `supabase.ts`, `utils.ts`).
- `public/`: Static assets.
- `supabase/`: Supabase related files, including migrations.
- `types/`: TypeScript type definitions (e.g., `database.ts`).

## Important Commands

- `npm install`: Install project dependencies.
- `npm run dev`: Start the development server.
- `npm run build`: Build the Next.js application for production.
- `npm run start`: Start the production server (after building).
- `npm run lint`: Run ESLint to check for code quality issues.

## Conventions and Guidelines

- **Code Style**: Follows Next.js and TypeScript best practices. ESLint is configured for code consistency.
- **Component Structure**: Components are organized by feature or by their reusability (e.g., `components/Leads` vs. `components/ui`).
- **Data Fetching**: Uses React Query for efficient data fetching, caching, and synchronization.
- **Authentication**: Handled via Supabase Auth, with `AuthContext` for global access to authentication state.
- **Database Interactions**: Managed through the Supabase client library (`lib/supabase.ts`).
- **UI/UX**: Adheres to Material Design principles where Material-UI components are used, and follows Shadcn UI conventions for other components.

## Next Steps / Common Tasks

- **Adding a new page**: Create a new file in the `app/` directory following the Next.js file-system routing conventions.
- **Creating a new component**: Add the component to an appropriate subdirectory within `components/`.
- **Modifying UI**: Adjust Tailwind CSS classes or modify Radix UI/Material-UI component props.
- **Database Schema Changes**: Use Supabase migrations (files in `supabase/migrations/`).
- **API Routes**: Next.js API routes can be added within the `app/api/` directory (not explicitly shown but standard Next.js practice).
