const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path
require('dotenv').config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}, 'name email originalEmail role').lean();
    
    console.log('\n--- ALL REGISTERED USERS ---\n');
    users.forEach(u => {
      console.log(`Role: [${u.role.toUpperCase()}]`);
      console.log(`Name: ${u.name}`);
      console.log(`Email: ${u.email}`);
      if (u.originalEmail) console.log(`Original Email: ${u.originalEmail}`);
      console.log('---');
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listUsers();
