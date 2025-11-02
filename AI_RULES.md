# AI Development Rules

## Tech Stack

• **Frontend Framework**: React with TypeScript
• **UI Library**: shadcn/ui components with Tailwind CSS for styling
• **Routing**: React Router for client-side navigation
• **State Management**: React Context API with Supabase for backend state
• **Backend**: Supabase for database, authentication, and real-time subscriptions
• **Build Tool**: Vite for fast development and building
• **Package Manager**: Bun (lockfile present) or npm
• **Deployment**: Lovable platform with automatic CI/CD

## Library Usage Rules

### UI & Styling
• **Always use** shadcn/ui components when available for consistent design
• **Style exclusively** with Tailwind CSS classes
• **Never use** plain CSS or other styling libraries
• **Use Lucide React** for all icons

### Data Management
• **Use Supabase client** for all database operations
• **Implement real-time updates** with Supabase subscriptions for live data
• **Store driver session** in React Context and sessionStorage
• **Never store sensitive data** in localStorage or sessionStorage

### Communication
• **Use Supabase functions** for server-side operations when needed
• **Integrate Telegram** for external notifications using bot API
• **Never implement** direct external API calls outside of approved integrations

### Components
• **Create new files** for all components (no inline components)
• **Use TypeScript** for all new files
• **Follow existing patterns** for component structure and props
• **Implement responsive design** for all UI components

### Error Handling
• **Use toast notifications** for user feedback
• **Log errors** to console for debugging
• **Never crash** the application - handle all errors gracefully

### Security
• **Verify driver authentication** before all protected actions
• **Use RLS (Row Level Security)** in Supabase for data protection
• **Never expose** Supabase service keys in frontend code