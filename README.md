# Claude Builder Club MSU Members Portal

A comprehensive web application for managing the Claude Builder Club at Michigan State University, built with modern React technologies and Supabase backend.

## 🚀 Features

- **Member Management**: Complete member lifecycle management including applications, approvals, and profile management
- **Event Management**: Create and manage club events with member registration
- **Class Management**: Organize and track educational sessions and workshops
- **Project Management**: Coordinate collaborative projects and track progress
- **Application System**: Streamlined application process for prospective members
- **Dashboard Analytics**: Comprehensive dashboards for admins and members
- **Responsive Design**: Fully responsive interface optimized for desktop and mobile
- **Real-time Updates**: Live data synchronization across all users

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router
- **Build Tool**: Vite
- **Deployment**: Vercel/Netlify compatible

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd members-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Database Setup**
   Run the Supabase migrations in the `supabase/migrations` directory to set up the database schema.

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:8080`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── DashboardLayout.tsx
├── contexts/           # React contexts (Auth, etc.)
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
├── lib/                # Utility functions
├── pages/              # Route components
│   ├── dashboard/      # Dashboard pages
│   ├── Auth.tsx        # Authentication page
│   ├── Index.tsx       # Landing page
│   └── NotFound.tsx    # 404 page
└── main.tsx           # Application entry point

supabase/
└── migrations/        # Database schema migrations
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Contributing

We welcome contributions to improve the Claude Builder Club Members Portal! Please follow these guidelines:

### Development Workflow

1. **Fork the repository** and create your feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow coding standards**
   - Use TypeScript for all new code
   - Follow the existing code style and naming conventions
   - Write meaningful commit messages

3. **Testing**
   - Test your changes thoroughly
   - Ensure no existing functionality is broken
   - Run `npm run lint` to check code quality

4. **Pull Request Process**
   - Create a clear, descriptive PR title
   - Provide a detailed description of your changes
   - Reference any related issues
   - Ensure all CI checks pass

### Code Style Guidelines

- **TypeScript**: Strict type checking enabled
- **Component Structure**: Functional components with hooks
- **Styling**: Tailwind CSS with component-based approach
- **File Naming**: PascalCase for components, camelCase for utilities
- **Imports**: Group imports by external libraries, then internal modules

### Areas for Contribution

- UI/UX improvements
- Performance optimizations
- New features for member management
- Mobile responsiveness enhancements
- Accessibility improvements
- Documentation updates

## 📄 License

This project is private and proprietary to the Claude Builder Club at Michigan State University.

## 👨‍💻 Contributors

**Ankur Desai**

For questions or support, please contact the development team.

---

*Built with ❤️ for the Claude Builder Club community at Michigan State University*
