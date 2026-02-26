const bcrypt = require('bcryptjs');

async function createAdmin() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('Email: admin@alansar.org');
  console.log('Password: admin123');
  console.log('\nHashed Password:');
  console.log(hashedPassword);
  console.log('\nشغل هذا في Supabase SQL Editor:');
  console.log(`INSERT INTO admins (email, password, name) VALUES ('admin@alansar.org', '${hashedPassword}', 'المدير');`);
}

createAdmin();
