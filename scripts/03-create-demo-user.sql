-- Create a demo user with a known password hash for testing
-- This script ensures the demo login works properly

-- First, clean up any existing demo user data
DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@example.com');
DELETE FROM punches WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@example.com');
DELETE FROM redeemed_prizes WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@example.com');
DELETE FROM punch_cards WHERE user_id IN (SELECT id FROM users WHERE email = 'demo@example.com');
DELETE FROM users WHERE email = 'demo@example.com';

-- Insert demo user with simple password hash for 'demo123'
INSERT INTO users (email, name, phone, password_hash, is_verified) VALUES
('demo@example.com', 'Demo User', '+1555123456', 'demo_hash_123', true);

-- Create punch cards for demo user (using subqueries to get IDs)
INSERT INTO punch_cards (user_id, business_id, current_punches, total_punches)
SELECT 
    u.id as user_id,
    b.id as business_id,
    CASE 
        WHEN b.name = 'Coffee Corner' THEN 3
        WHEN b.name = 'Pizza Palace' THEN 2
        WHEN b.name = 'Burger Barn' THEN 1
        ELSE 0
    END as current_punches,
    CASE 
        WHEN b.name = 'Coffee Corner' THEN 8
        WHEN b.name = 'Pizza Palace' THEN 5
        WHEN b.name = 'Burger Barn' THEN 3
        ELSE 0
    END as total_punches
FROM users u, businesses b 
WHERE u.email = 'demo@example.com';

-- Add some punch history for demo user
INSERT INTO punches (punch_card_id, user_id, business_id, location_data)
SELECT 
    pc.id as punch_card_id,
    pc.user_id,
    pc.business_id,
    '{"demo": true, "location": "Demo Location"}'::jsonb as location_data
FROM punch_cards pc
JOIN users u ON pc.user_id = u.id
JOIN businesses b ON pc.business_id = b.id
WHERE u.email = 'demo@example.com'
AND pc.current_punches > 0;
