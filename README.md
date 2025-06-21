# TrueNorth - Faith-Centered AI Life Coach

TrueNorth is a Progressive Web App (PWA) that combines Biblical wisdom with AI technology to provide personalized spiritual guidance, encouragement, and practical advice for your daily walk with faith.

## Features

### Core Features
- **AI-Powered Conversations**: Chat with TrueNorth for spiritual guidance and biblical insights
- **Digital Journal**: Track your spiritual journey with automatic journaling from conversations
- **Prayer Tracking**: Manage prayer requests and celebrate answered prayers
- **Scripture Memory**: Memorize and review Bible verses with spaced repetition
- **Daily Devotionals**: Access curated and AI-personalized devotional content
- **Bible Browser**: Search and explore scripture with multiple translations
- **Spiritual Habits**: Track and build consistent spiritual disciplines
- **Mood & Wellbeing**: Monitor your spiritual and emotional health

### Premium Features (TrueNorth Pro)
- **Unlimited AI Conversations**: No limits on spiritual guidance sessions
- **Advanced Prayer Tracking**: Enhanced organization and insights
- **Personalized AI Devotionals**: Content tailored to your spiritual journey
- **Premium Voice Features**: High-quality ElevenLabs voices for audio content
- **Enhanced Scripture Memory**: Advanced memorization tools and scheduling
- **Priority Support**: Get help when you need it most

### Progressive Web App Features
- **Offline Access**: Continue your spiritual journey even without internet
- **Install on Device**: Add TrueNorth to your home screen for quick access
- **Push Notifications**: Gentle reminders for prayer, devotions, and habits
- **Cross-Platform**: Works on mobile, tablet, and desktop devices

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Shadcn/UI** components
- **Lucide React** icons
- **Service Workers** for offline functionality

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security
- **Supabase Edge Functions** for serverless API
- **OpenAI GPT-4** for AI conversations and content generation

### Integrations
- **Stripe** for subscription management
- **ElevenLabs** for premium text-to-speech
- **Bible API** for scripture access
- **Web Speech API** for voice input

## Getting Started

### Prerequisites
- Node.js 18 or higher
- A Supabase project
- Stripe account (for payments)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/truenorth.git
   cd truenorth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your environment variables in `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://qkgtlxhuvuongwdzyizl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZ3RseGh1dnVvbmd3ZHp5aXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NDM1MDcsImV4cCI6MjA2NDUxOTUwN30.Hm3YuDkpSVSBwGS5fWr7LykF6JXNLFrgGIB6t6mms04
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the migration files in `supabase/migrations/`
   - Deploy the Edge Functions in `supabase/functions/`
   - Configure your environment variables in the Supabase dashboard

5. **Configure Stripe (Optional)**
   - Create a Stripe account and get your keys
   - Set up webhooks pointing to your deployed Edge Functions
   - Add Stripe keys to your Supabase environment variables

6. **Run the development server**
   ```bash
   npm run dev
   ```

### Deployment

The app is configured for deployment on Netlify with the following features:
- Automatic builds from Git
- Edge Functions support
- Environment variable management
- Custom redirects for SPA routing

1. **Deploy to Netlify**
   - Connect your Git repository to Netlify
   - Set environment variables in Netlify dashboard
   - Deploy Edge Functions
   - Configure custom domain (optional)

2. **Set up Stripe webhooks**
   - Configure webhook endpoints in Stripe dashboard
   - Point to your deployed Edge Functions

## Development

### Database Schema
The app uses PostgreSQL with the following main tables:
- `profiles` - User profile information
- `journal_entries` - Digital journal entries
- `prayer_requests` - Prayer tracking
- `scripture_memory` - Bible verse memorization
- `spiritual_habits` - Habit tracking
- `ai_devotionals` - Personalized devotional content
- `stripe_customers` - Stripe customer data
- `stripe_subscriptions` - Subscription management

### API Routes
- `/functions/v1/chat` - AI conversation endpoint
- `/functions/v1/stripe-checkout` - Stripe checkout session creation
- `/functions/v1/stripe-webhook` - Stripe webhook handler
- `/functions/v1/generate-ai-devotional` - AI devotional generation
- `/functions/v1/elevenlabs-tts` - Text-to-speech conversion

### Adding New Features
1. Create new database tables with proper RLS policies
2. Add TypeScript types in `src/lib/types.ts`
3. Create Supabase helper functions in `src/lib/supabase.ts`
4. Build React components with Tailwind styling
5. Add routes in `src/App.tsx`

## Security & Privacy

- **Row Level Security**: All database access is protected by user-specific policies
- **Authentication**: Secure user authentication via Supabase Auth
- **API Security**: Edge Functions use JWT verification
- **Data Privacy**: User data is encrypted and protected
- **Content Filtering**: AI responses are filtered for appropriate spiritual content

## Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please email support@truenorth.app or visit our help center.

---

**Built with ❤️ and Biblical wisdom**