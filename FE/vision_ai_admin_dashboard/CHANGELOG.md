## v1.6.0 Enhanced Error Handling (2025-09-17)

### 🛡️ Major: Enhanced Error Handling System

- **feat(error-handling)**: Comprehensive error handling system with medical-grade reliability
- **feat(query-client)**: Enhanced QueryClient with intelligent retry logic and exponential backoff
- **feat(error-interceptor)**: Global error interceptor with frequency tracking and health monitoring
- **feat(error-boundaries)**: React error boundaries with specialized medical context fallbacks
- **feat(loading-states)**: Skeleton loaders and error state components with timeout handling
- **feat(health-monitoring)**: Real-time system health status component with uptime tracking
- **feat(vietnamese-localization)**: Vietnamese error messages for healthcare staff
- **feat(network-awareness)**: Online/offline detection with graceful degradation

### 🏥 Healthcare Features

- **feat(medical-data)**: Specialized error handling for patient data operations
- **feat(compliance)**: Audit logging for medical data errors and compliance tracking
- **feat(dashboard)**: Enhanced dashboard with error boundaries and retry mechanisms
- **feat(prisma-errors)**: Special handling for Prisma prepared statement errors

### 🔧 Technical Improvements

- **feat(typescript)**: 100% TypeScript coverage with comprehensive error type definitions
- **feat(performance)**: Optimized query caching strategies and intelligent cache invalidation
- **feat(retry-logic)**: Smart retry logic based on error classification (network, database, server, timeout)
- **feat(error-classification)**: Automatic error categorization with appropriate recovery strategies

### 📚 Documentation

- **docs**: Complete ERROR_HANDLING.md documentation with usage patterns and best practices
- **docs**: Updated README.md to reflect healthcare context and enhanced features
- **docs**: DOCS_CODE_ANALYSIS.md for documentation consistency tracking

### 🔄 Migration & Compatibility

- **refactor(main)**: Updated main.tsx to use enhanced QueryClient with custom error handlers
- **refactor(services)**: All API services now integrate with global error interceptor
- **fix(build)**: Build optimization - 0 TypeScript errors, 2.88s build time
- **compat**: Backward compatible - no breaking changes to existing code

## v1.6.0 (2025-08-14) - Previous Release

### Feat

- **auth**: update request-otp route to use OtpRequestPage component
- **auth**: add OTP request and login functionality
- refactor user navigation and profile dropdown to use react-query for user data fetching
- Update document title globally and add notifications route
- add DateRangePicker component and integrate into Dashboard; update sidebar and routes for caregivers and customers
- update user routes to use 'customer' prefix and create new route files
- add Services component for customer service details and management

### Fix

- update user service import path to reflect new user type definitions

### Refactor

- update UserStatsGrid and UserTabs components for improved styling and accessibility
- restructure user type definitions and schemas for better clarity and maintainability
- update UI components for consistency and improved accessibility
- reorganize user-related imports and remove notifications route

## v1.5.0 (2025-08-04)

### Feat

- create StatCard component for dashboard statistics display

## v1.4.1 (2025-06-25)

### Fix

- user list overflow in chat (#160)
- prevent showing collapsed menu on mobile (#155)
- white background select dropdown in dark mode (#149)

### Refactor

- update font config guide in fonts.ts (#164)

## v1.4.0 (2025-05-25)

### Feat

- **clerk**: add Clerk for auth and protected route (#146)

### Fix

- add an indicator for nested pages in search (#147)
- update faded-bottom color with css variable (#139)

## v1.3.0 (2025-04-16)

### Fix

- replace custom otp with input-otp component (#131)
- disable layout animation on mobile (#130)
- upgrade react-day-picker and update calendar component (#129)

### Others

- upgrade Tailwind CSS to v4 (#125)
- upgrade dependencies (#128)
- configure automatic code-splitting (#127)

## v1.2.0 (2025-04-12)

### Feat

- add loading indicator during page transitions (#119)
- add light favicons and theme-based switching (#112)
- add new chat dialog in chats page (#90)

### Fix

- add fallback font for fontFamily (#110)
- broken focus behavior in add user dialog (#113)

## v1.1.0 (2025-01-30)

### Feat

- allow changing font family in setting

### Fix

- update sidebar color in dark mode for consistent look (#87)
- use overflow-clip in table paginations (#86)
- **style**: update global scrollbar style (#82)
- toolbar filter placeholder typo in user table (#76)

## v1.0.3 (2024-12-28)

### Fix

- add gap between buttons in import task dialog (#70)
- hide button sort if column cannot be hidden & update filterFn (#69)
- nav links added in profile dropdown (#68)

### Refactor

- optimize states in users/tasks context (#71)

## v1.0.2 (2024-12-25)

### Fix

- update overall layout due to scroll-lock bug (#66)

### Refactor

- analyze and remove unused files/exports with knip (#67)

## v1.0.1 (2024-12-14)

### Fix

- merge two button components into one (#60)
- loading all tabler-icon chunks in dev mode (#59)
- display menu dropdown when sidebar collapsed (#58)
- update spacing & alignment in dialogs/drawers
- update border & transition of sticky columns in user table
- update heading alignment to left in user dialogs
- add height and scroll area in user mutation dialogs
- update `/dashboard` route to just `/`
- **build**: replace require with import in tailwind.config.js

### Refactor

- remove unnecessary layout-backup file

## v1.0.0 (2024-12-09)

### BREAKING CHANGE

- Restructured the entire folder
hierarchy to adopt a feature-based structure. This
change improves code modularity and maintainability
but introduces breaking changes.

### Feat

- implement task dialogs
- implement user invite dialog
- implement users CRUD
- implement global command/search
- implement custom sidebar trigger
- implement coming-soon page

### Fix

- uncontrolled issue in account setting
- card layout issue in app integrations page
- remove form reset logic from useEffect in task import
- update JSX types due to react 19
- prevent card stretch in filtered app layout
- layout wrap issue in tasks page on mobile
- update user column hover and selected colors
- add setTimeout in user dialog closing
- layout shift issue in dropdown modal
- z-axis overflow issue in header
- stretch search bar only in mobile
- language dropdown issue in account setting
- update overflow contents with scroll area

### Refactor

- update layouts and extract common layout
- reorganize project to feature-based structure

## v1.0.0-beta.5 (2024-11-11)

### Feat

- add multiple language support (#37)

### Fix

- ensure site syncs with system theme changes (#49)
- recent sales responsive on ipad view (#40)

## v1.0.0-beta.4 (2024-09-22)

### Feat

- upgrade theme button to theme dropdown (#33)
- **a11y**: add "Skip to Main" button to improve keyboard navigation (#27)

### Fix

- optimize onComplete/onIncomplete invocation (#32)
- solve asChild attribute issue in custom button (#31)
- improve custom Button component (#28)

## v1.0.0-beta.3 (2024-08-25)

### Feat

- implement chat page (#21)
- add 401 error page (#12)
- implement apps page
- add otp page

### Fix

- prevent focus zoom on mobile devices (#20)
- resolve eslint script issue (#18)
- **a11y**: update default aria-label of each pin-input
- resolve OTP paste issue in multi-digit pin-input
- update layouts and solve overflow issues (#11)
- sync pin inputs programmatically

## v1.0.0-beta.2 (2024-03-18)

### Feat

- implement custom pin-input component (#2)

## v1.0.0-beta.1 (2024-02-08)

### Feat

- update theme-color meta tag when theme is updated
- add coming soon page in broken pages
- implement tasks table and page
- add remaining settings pages
- add example error page for settings
- update general error page to be more flexible
- implement settings layout and settings profile page
- add error pages
- add password-input custom component
- add sign-up page
- add forgot-password page
- add box sign in page
- add email + password sign in page
- make sidebar responsive and accessible
- add tailwind prettier plugin
- make sidebar collapsed state in local storage
- add check current active nav hook
- add loader component ui
- update dropdown nav by default if child is active
- add main-panel in dashboard
- **ui**: add dark mode
- **ui**: implement side nav ui

### Fix

- update incorrect overflow side nav height
- exclude shadcn components from linting and remove unused props
- solve text overflow issue when nav text is long
- replace nav with dropdown in mobile topnav
- make sidebar scrollable when overflow
- update nav link keys
- **ui**: update label style

### Refactor

- move password-input component into custom component dir
- add custom button component
- extract redundant codes into layout component
- update react-router to use new api for routing
- update main panel layout
- update major layouts and styling
- update main panel to be responsive
- update sidebar collapsed state to false in mobile
- update sidebar logo and title
- **ui**: remove unnecessary spacing
- remove unused files
