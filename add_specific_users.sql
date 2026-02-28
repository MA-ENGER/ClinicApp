-- Create accounts for the user
INSERT INTO users (email, password_hash, role) 
VALUES 
('enger60@gmail.com', '$2a$10$wI5f6I.pM0DkC.U/W5/vbe.9R7l1R5Sg6U3/Gk0VqfV4W3qFp6K.W', 'PATIENT'), -- password: password123
('enger603@gmail.com', '$2a$10$wI5f6I.pM0DkC.U/W5/vbe.9R7l1R5Sg6U3/Gk0VqfV4W3qFp6K.W', 'DOCTOR');

-- Create profiles
INSERT INTO patients (user_id, full_name, date_of_birth)
SELECT id, 'Enger 60', '1995-01-01' FROM users WHERE email = 'enger60@gmail.com';

INSERT INTO doctors (user_id, full_name, specialty)
SELECT id, 'Dr. Enger 603', 'General Surgeon' FROM users WHERE email = 'enger603@gmail.com';
