-- Create a Test Patient user
INSERT INTO users (email, password_hash, role) 
VALUES ('patient@test.com', '$2a$10$wI5f6I.pM0DkC.U/W5/vbe.9R7l1R5Sg6U3/Gk0VqfV4W3qFp6K.W', 'PATIENT') -- password: password123
RETURNING id;

-- Create a Test Doctor user
INSERT INTO users (email, password_hash, role) 
VALUES ('doctor@test.com', '$2a$10$wI5f6I.pM0DkC.U/W5/vbe.9R7l1R5Sg6U3/Gk0VqfV4W3qFp6K.W', 'DOCTOR') -- password: password123
RETURNING id;

-- After running the above, we need to link them to profiles
-- (assuming first ID is patient and second is doctor for this script)
-- NOTE: In a real environment, you'd match the specific UUIDs returned.

-- Create Patient Profile
INSERT INTO patients (user_id, full_name, date_of_birth)
SELECT id, 'John Doe', '1990-05-15' FROM users WHERE email = 'patient@test.com';

-- Create Doctor Profile
INSERT INTO doctors (user_id, full_name, specialty)
SELECT id, 'Dr. Smith', 'General Practitioner' FROM users WHERE email = 'doctor@test.com';
