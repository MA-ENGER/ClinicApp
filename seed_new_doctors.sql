-- Create a doctor user
INSERT INTO users (phone_number, password_hash, role) 
VALUES ('1234567890', '$2a$10$wI5f6I.pM0DkC.U/W5/vbe.9R7l1R5Sg6U3/Gk0VqfV4W3qFp6K.W', 'DOCTOR');

-- Add doctor details
INSERT INTO doctors (user_id, full_name, specialty, hospital, location, bio, consultation_fee)
SELECT id, 'Dr. Ahmed Khalid', 'Cardiologist', 'Al-Noor Specialist Hospital', 'Dubai Medical District', 'Expert in cardiac care with over 15 years of experience.', 150.00
FROM users WHERE phone_number = '1234567890';

-- Add another doctor
INSERT INTO users (phone_number, password_hash, role) 
VALUES ('0987654321', '$2a$10$wI5f6I.pM0DkC.U/W5/vbe.9R7l1R5Sg6U3/Gk0VqfV4W3qFp6K.W', 'DOCTOR');

INSERT INTO doctors (user_id, full_name, specialty, hospital, location, bio, consultation_fee)
SELECT id, 'Dr. Sarah Smith', 'Pediatrician', 'City Children Clinic', 'Downtown Mall area', 'Specialist in child health and nutrition.', 100.00
FROM users WHERE phone_number = '0987654321';
