-- Insert sample businesses
INSERT INTO businesses (name, description, nfc_tag_id, max_punches) VALUES
('Coffee Corner', 'Your neighborhood coffee shop', 'nfc_coffee_001', 10),
('Pizza Palace', 'Authentic Italian pizza', 'nfc_pizza_001', 8),
('Burger Barn', 'Gourmet burgers and fries', 'nfc_burger_001', 12);

-- Insert sample users with simple password hash for demo
-- Password for all demo users is 'demo123'
INSERT INTO users (email, name, phone, password_hash, is_verified) VALUES
('john@example.com', 'John Doe', '+1234567890', 'demo_hash_123', true),
('jane@example.com', 'Jane Smith', '+1234567891', 'demo_hash_123', true),
('mike@example.com', 'Mike Johnson', '+1234567892', 'demo_hash_123', true);

-- Insert sample prizes
INSERT INTO prizes (business_id, name, description, punches_required) 
SELECT 
  b.id,
  CASE 
    WHEN b.name = 'Coffee Corner' THEN 'Free Coffee'
    WHEN b.name = 'Pizza Palace' THEN 'Free Pizza Slice'
    WHEN b.name = 'Burger Barn' THEN 'Free Burger'
  END,
  CASE 
    WHEN b.name = 'Coffee Corner' THEN 'Get any coffee drink on the house'
    WHEN b.name = 'Pizza Palace' THEN 'Choose any pizza slice for free'
    WHEN b.name = 'Burger Barn' THEN 'Free classic burger with fries'
  END,
  CASE 
    WHEN b.name = 'Coffee Corner' THEN 5
    WHEN b.name = 'Pizza Palace' THEN 4
    WHEN b.name = 'Burger Barn' THEN 6
  END
FROM businesses b;

-- Insert premium prizes
INSERT INTO prizes (business_id, name, description, punches_required) 
SELECT 
  b.id,
  CASE 
    WHEN b.name = 'Coffee Corner' THEN 'Free Coffee for a Week'
    WHEN b.name = 'Pizza Palace' THEN 'Free Large Pizza'
    WHEN b.name = 'Burger Barn' THEN 'Free Meal Combo'
  END,
  CASE 
    WHEN b.name = 'Coffee Corner' THEN 'One free coffee every day for a week'
    WHEN b.name = 'Pizza Palace' THEN 'Any large pizza with up to 3 toppings'
    WHEN b.name = 'Burger Barn' THEN 'Burger, fries, and drink combo'
  END,
  b.max_punches
FROM businesses b;

-- Create some sample punch cards for demo user john@example.com
INSERT INTO punch_cards (user_id, business_id, current_punches, total_punches)
SELECT 
  u.id,
  b.id,
  CASE 
    WHEN b.name = 'Coffee Corner' THEN 3
    WHEN b.name = 'Pizza Palace' THEN 2
    ELSE 1
  END,
  CASE 
    WHEN b.name = 'Coffee Corner' THEN 8
    WHEN b.name = 'Pizza Palace' THEN 5
    ELSE 3
  END
FROM users u, businesses b 
WHERE u.email = 'john@example.com';

-- Add some punch history for demo
INSERT INTO punches (punch_card_id, user_id, business_id, location_data)
SELECT 
  pc.id,
  pc.user_id,
  pc.business_id,
  '{"demo": true, "timestamp": "2024-01-15T10:30:00Z"}'::jsonb
FROM punch_cards pc
JOIN users u ON pc.user_id = u.id
WHERE u.email = 'john@example.com';
