const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Table = require('./models/Table');

dotenv.config();

async function findOrCreateUser({ name, email, phone, role, password }) {
  let user = await User.findOne({ email });
  if (user) return user;

  const passwordHash = await bcrypt.hash(password, 10);
  user = await User.create({ name, email, phone, role, passwordHash });
  console.log(`Created ${role}: ${email}`);
  return user;
}

async function findOrCreateRestaurant(ownerId, details) {
  let restaurant = await Restaurant.findOne({ ownerId, name: details.name });
  if (restaurant) return restaurant;

  restaurant = await Restaurant.create({ ownerId, ...details });
  console.log(`Created restaurant: ${restaurant.name}`);
  return restaurant;
}

async function addTables(restaurant, tables) {
  for (const tableDetails of tables) {
    const exists = await Table.findOne({
      restaurantId: restaurant._id,
      tableNumber: tableDetails.tableNumber,
    });

    if (!exists) {
      await Table.create({ restaurantId: restaurant._id, ...tableDetails });
      console.log(`Added table ${tableDetails.tableNumber} at ${restaurant.name}`);
    }
  }
}

async function seed() {
  try {
    await connectDB();

    const owner = await findOrCreateUser({
      name: 'Demo Owner',
      email: 'owner.demo@example.com',
      phone: '+92 300 0000001',
      role: 'owner',
      password: 'secret123',
    });

    await findOrCreateUser({
      name: 'Demo Customer',
      email: 'customer.demo@example.com',
      phone: '+92 300 0000002',
      role: 'customer',
      password: 'secret123',
    });

    const sampleRestaurants = [
      {
        name: 'Saffron Courtyard',
        description: 'Classic Pakistani favorites in a relaxed courtyard setting.',
        cuisine: 'Pakistani',
        address: 'Block 5, Clifton, Karachi',
        phone: '+92 21 30000001',
        openingTime: '12:00',
        closingTime: '23:00',
        tables: [
          { tableNumber: 'P1', capacity: 2 },
          { tableNumber: 'P2', capacity: 4 },
          { tableNumber: 'P3', capacity: 6 },
        ],
      },
      {
        name: 'Olive & Ember',
        description: 'Handmade pasta, wood-fired plates, and a thoughtful seasonal menu.',
        cuisine: 'Italian',
        address: 'Gulberg III, Lahore',
        phone: '+92 42 30000002',
        openingTime: '11:00',
        closingTime: '22:30',
        tables: [
          { tableNumber: 'I1', capacity: 2 },
          { tableNumber: 'I2', capacity: 4 },
          { tableNumber: 'I3', capacity: 4 },
          { tableNumber: 'I4', capacity: 6 },
        ],
      },
      {
        name: 'Juniper House',
        description: 'A bright neighborhood café serving brunch, tea, and fresh bakes.',
        cuisine: 'Cafe',
        address: 'F-7, Islamabad',
        phone: '+92 51 30000003',
        openingTime: '08:00',
        closingTime: '21:00',
        tables: [
          { tableNumber: 'C1', capacity: 2 },
          { tableNumber: 'C2', capacity: 2 },
          { tableNumber: 'C3', capacity: 4 },
        ],
      },
    ];

    for (const details of sampleRestaurants) {
      const { tables, ...restaurantDetails } = details;
      const restaurant = await findOrCreateRestaurant(owner._id, restaurantDetails);
      await addTables(restaurant, tables);
    }

    console.log('Sample data is ready.');
  } catch (err) {
    console.error('Could not seed sample data:', err.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

seed();
