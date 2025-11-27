# Nirnoy Architecture - Production Ready

## Overview

Nirnoy is built for scale, handling millions of health records, AI conversations, and real-time queue management.

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization

### Backend & Database
- **Supabase** - PostgreSQL database, real-time, auth, storage
- **NestJS** - API server (optional, for complex operations)
- **Prisma** - ORM (for NestJS backend)

### AI & ML
- **Google Gemini** - Conversational AI, health insights
- **Gemini Live API** - Voice agents

### Infrastructure
- **Supabase Realtime** - WebSocket connections
- **In-memory Cache** - Client-side caching
- **CDN** - Static asset delivery

## Data Flow

```
User → React App → Supabase Client → PostgreSQL
                              ↓
                    Real-time Subscriptions
                              ↓
                    WebSocket Updates → UI
```

## Database Schema

### Core Tables

1. **users** - Authentication and basic user info
2. **patients** - Patient profiles and health data
3. **doctors** - Doctor profiles and credentials
4. **appointments** - Appointment scheduling
5. **queue_entries** - Live queue management
6. **health_records** - All health-related records
7. **prescriptions** - Medication prescriptions
8. **ai_conversations** - AI chat history
9. **ai_insights** - AI-generated insights and predictions
10. **notifications** - User notifications
11. **health_analytics** - Aggregated health data for trends

## Real-time Architecture

### WebSocket Channels

- `appointment:{id}` - Appointment updates
- `queue:{doctorId}` - Queue updates
- `notifications:{userId}` - New notifications
- `patient:{patientId}` - Patient data updates
- `conversation:{id}` - AI conversation updates

### Subscription Pattern

```typescript
const channel = supabase
  .channel(`appointment:${appointmentId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, callback)
  .subscribe();
```

## AI Integration

### Conversation Flow

1. User sends message → `AIConversationService.addMessage()`
2. Message stored in `ai_conversations` table
3. Gemini API processes with context
4. Response stored and sent to user
5. Insights extracted and stored in `ai_insights`

### Health Insights

- **Risk Prediction**: Analyze patient history for future risks
- **Pattern Detection**: Identify health patterns across data
- **Location-based**: Aggregate data by location for trends
- **Pandemic Alerts**: Detect unusual patterns across regions

## Caching Strategy

### Client-side Cache
- Patient data: 5 minutes
- Doctor profiles: 10 minutes
- Appointments: 2 minutes
- Health records: 5 minutes

### Cache Keys
- `patient:{id}`
- `doctor:{id}`
- `appointment:{id}`
- `health_records:{patientId}`

## Security

### Row Level Security (RLS)
- Users can only access their own data
- Doctors can access their patients' data
- Public can read active verified doctors

### API Security
- Supabase handles authentication
- JWT tokens for API requests
- Rate limiting on API endpoints

## Scalability

### Database
- Indexed queries for fast lookups
- Partitioning for large tables (future)
- Read replicas for high read load

### Real-time
- Channel-based subscriptions
- Efficient event filtering
- Connection pooling

### AI Processing
- Async processing for insights
- Batch processing for analytics
- Caching of common queries

## Monitoring

### Metrics to Track
- Database query performance
- Real-time connection count
- AI API usage
- Error rates
- User activity

### Logging
- Supabase logs in dashboard
- Client-side error tracking
- API request logging

## Deployment

### Production Checklist
- [ ] Supabase project configured
- [ ] Database migrations executed
- [ ] Environment variables set
- [ ] Domain configured (www.nirnoy.ai)
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

### CI/CD
- Automated testing
- Build optimization
- Environment-specific configs
- Rollback strategy

## Future Enhancements

1. **Redis Cache** - Server-side caching
2. **Message Queue** - For async AI processing
3. **Data Warehouse** - For analytics
4. **ML Models** - Custom health prediction models
5. **Microservices** - Split into smaller services
6. **GraphQL** - Alternative API layer

