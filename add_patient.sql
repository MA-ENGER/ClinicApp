INSERT INTO users (phone_number, password_hash, role) 
VALUES ('1112223333', '$2a$10$wI5f6I.pM0DkC.U/W5/vbe.9R7l1R5Sg6U3/Gk0VqfV4W3qFp6K.W', 'PATIENT');
INSERT INTO patients (user_id, full_name, date_of_birth)
SELECT id, 'Test Patient', '1990-01-01' FROM users WHERE phone_number = '1112223333';
