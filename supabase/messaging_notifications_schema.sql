-- ============================================
-- MESSAGING AND NOTIFICATIONS SCHEMA
-- For Nirnoy Health OS
-- ============================================

-- ============ CONVERSATIONS TABLE ============
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    last_message_id UUID,
    unread_count_patient INTEGER DEFAULT 0,
    unread_count_doctor INTEGER DEFAULT 0,
    UNIQUE(patient_id, doctor_id)
);

-- ============ MESSAGES TABLE ============
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'prescription', 'appointment')),
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- ============ NOTIFICATIONS TABLE ============
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('appointment', 'medication', 'health_alert', 'message', 'system', 'reminder', 'family')),
    title TEXT NOT NULL,
    title_bn TEXT,
    message TEXT NOT NULL,
    message_bn TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    action_url TEXT,
    action_label TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ============ APPOINTMENT REMINDERS TABLE ============
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('before_1_day', 'before_2_hours', 'before_30_min', 'queue_update')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    channels TEXT[] DEFAULT ARRAY['in_app'],
    appointment_details JSONB
);

-- ============ NOTIFICATION PREFERENCES TABLE ============
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    appointment_before_1_day BOOLEAN DEFAULT TRUE,
    appointment_before_2_hours BOOLEAN DEFAULT TRUE,
    appointment_before_30_min BOOLEAN DEFAULT FALSE,
    queue_updates BOOLEAN DEFAULT TRUE,
    medication_reminders BOOLEAN DEFAULT TRUE,
    medication_refill BOOLEAN DEFAULT TRUE,
    medication_missed BOOLEAN DEFAULT TRUE,
    channels_in_app BOOLEAN DEFAULT TRUE,
    channels_sms BOOLEAN DEFAULT TRUE,
    channels_email BOOLEAN DEFAULT FALSE,
    channels_push BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_doctor ON conversations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_reminders_patient ON appointment_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON appointment_reminders(scheduled_for) WHERE status = 'pending';

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see their own conversations
CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT
    USING (
        patient_id = auth.uid() OR 
        doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    );

CREATE POLICY "Patients can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Users can update their conversations"
    ON conversations FOR UPDATE
    USING (
        patient_id = auth.uid() OR 
        doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    );

-- Messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE patient_id = auth.uid() OR 
                  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their conversations"
    ON messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE patient_id = auth.uid() OR 
                  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    USING (sender_id = auth.uid());

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view their notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (TRUE); -- Allow system/service role to create

CREATE POLICY "Users can update their notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- Appointment Reminders
CREATE POLICY "Users can view their reminders"
    ON appointment_reminders FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "System can manage reminders"
    ON appointment_reminders FOR ALL
    USING (TRUE); -- Managed by service role

-- Notification Preferences
CREATE POLICY "Users can view their preferences"
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their preferences"
    ON notification_preferences FOR ALL
    USING (user_id = auth.uid());

-- ============ TRIGGERS ============
-- Update conversation timestamp when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW(),
        last_message_id = NEW.id
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Increment unread count when new message is sent
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'patient' THEN
        UPDATE conversations
        SET unread_count_doctor = unread_count_doctor + 1
        WHERE id = NEW.conversation_id;
    ELSE
        UPDATE conversations
        SET unread_count_patient = unread_count_patient + 1
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_unread_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_unread_count();

-- ============ REALTIME ============
-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ============ STORAGE BUCKET ============
-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'message-attachments' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'message-attachments');

