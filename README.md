# Quiz Story Generator

An educational story generation application that creates engaging stories with quizzes based on user inputs.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- OpenRouter API key

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
PORT=3000
```

### Installation
1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Development
1. Start the development server:
```bash
npm run dev
```

### Production
1. Build the application:
```bash
npm run build
```
2. Start the production server:
```bash
npm start
```

## Best Practices

### Authentication
1. Always use environment variables for sensitive data
2. Initialize Supabase client once and share the instance
3. Check authentication state before making protected API calls
4. Handle auth errors gracefully with user-friendly messages

### Frontend
1. Load scripts in the correct order:
   ```html
   <!-- Environment config first -->
   <script src="env-config.js"></script>
   <!-- Third-party libraries -->
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js"></script>
   <!-- Application modules -->
   <script type="module" src="js/config.js"></script>
   <script type="module" src="js/supabase.js"></script>
   <script type="module" src="js/apiService.js"></script>
   <script type="module" src="js/uiHandler.js"></script>
   <script type="module" src="js/quizHandler.js"></script>
   <script type="module" src="js/auth.js"></script>
   <script type="module" src="js/main.js"></script>
   ```

2. Use ES modules for better code organization
3. Implement proper error handling and user feedback
4. Use TypeScript for better type safety (recommended)

### Backend
1. Validate all inputs before processing
2. Use proper error handling middleware
3. Implement rate limiting for API endpoints
4. Log important events and errors
5. Use environment variables for configuration

### Database
1. Use migrations for schema changes
2. Implement proper indexing
3. Use transactions for related operations
4. Implement proper error handling for database operations

### Security
1. Never expose sensitive data in client-side code
2. Use HTTPS in production
3. Implement proper CORS policies
4. Use secure session management
5. Implement rate limiting

### Performance
1. Implement caching where appropriate
2. Use proper indexing for database queries
3. Optimize API responses
4. Implement proper error handling and retries
5. Use compression for static assets

### Testing
1. Write unit tests for critical functionality
2. Implement integration tests
3. Use test environment variables
4. Mock external services in tests

### Deployment
1. Use proper environment variables
2. Implement proper logging
3. Use proper error handling
4. Implement proper monitoring
5. Use proper backup strategies

## Common Issues and Solutions

### Authentication Issues
1. Check if Supabase client is properly initialized
2. Verify environment variables are set correctly
3. Check if auth token is being sent with requests
4. Verify CORS settings in Supabase

### API Issues
1. Check if server is running
2. Verify API endpoints are correct
3. Check if all required fields are sent
4. Verify request format is correct

### Database Issues
1. Check database connection
2. Verify table structure
3. Check if proper permissions are set
4. Verify data format

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT 