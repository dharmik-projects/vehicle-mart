import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db';
import User from './models/User';
import Category from './models/Category';
import VehicleBrand from './models/VehicleBrand';
import VehicleModel from './models/VehicleModel';
import VehicleVariant from './models/VehicleVariant';

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    VehicleBrand.deleteMany({}),
    VehicleModel.deleteMany({}),
    VehicleVariant.deleteMany({}),
  ]);

  console.log('Cleared existing data');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  await User.create({
    name: 'Admin',
    email: 'admin@vehiclepart.com',
    password: adminPassword,
    role: 'admin',
    isActive: true,
  });
  console.log('Admin user created: admin@vehiclepart.com / admin123');

  // Create demo seller
  const sellerPassword = await bcrypt.hash('seller123', 12);
  await User.create({
    name: 'Demo Seller',
    email: 'seller@vehiclepart.com',
    password: sellerPassword,
    role: 'seller',
    isActive: true,
    sellerInfo: {
      businessName: 'AutoParts Hub',
      businessAddress: '123 Industrial Area, Mumbai',
      gstNumber: '27AABCU9603R1ZM',
      isApproved: true,
      description: 'Premium auto parts supplier',
    },
  });
  console.log('Demo seller created: seller@vehiclepart.com / seller123');

  // Create demo user
  const userPassword = await bcrypt.hash('user123', 12);
  await User.create({
    name: 'Demo User',
    email: 'user@vehiclepart.com',
    password: userPassword,
    role: 'user',
    isActive: true,
  });
  console.log('Demo user created: user@vehiclepart.com / user123');

  // ==================== CATEGORIES ====================
  const categories = await Category.insertMany([
    { name: 'Engine Parts', slug: 'engine-parts', description: 'Gaskets, pistons, cylinders, valves, and more', icon: '⚙️', sortOrder: 1 },
    { name: 'Brake System', slug: 'brake-system', description: 'Brake pads, discs, drums, calipers, fluid', icon: '🛑', sortOrder: 2 },
    { name: 'Clutch', slug: 'clutch', description: 'Clutch plates, bearings, cables, flywheel', icon: '🔧', sortOrder: 3 },
    { name: 'Suspension & Steering', slug: 'suspension-steering', description: 'Shock absorbers, springs, ball joints, tie rods', icon: '🚗', sortOrder: 4 },
    { name: 'Electrical', slug: 'electrical', description: 'Batteries, alternators, starters, wiring', icon: '⚡', sortOrder: 5 },
    { name: 'Filters', slug: 'filters', description: 'Oil, air, fuel, cabin filters', icon: '🌀', sortOrder: 6 },
    { name: 'Cooling System', slug: 'cooling-system', description: 'Radiators, thermostats, water pumps, hoses', icon: '❄️', sortOrder: 7 },
    { name: 'AC & Heating', slug: 'ac-heating', description: 'Compressors, condensers, blower motors', icon: '🌡️', sortOrder: 8 },
    { name: 'Body & Frame', slug: 'body-frame', description: 'Bumpers, fenders, doors, mirrors, panels', icon: '🚙', sortOrder: 9 },
    { name: 'Lights & Visibility', slug: 'lights-visibility', description: 'Headlights, tail lights, indicators, wipers', icon: '💡', sortOrder: 10 },
    { name: 'Sensors & Electronics', slug: 'sensors-electronics', description: 'ECU, oxygen sensors, MAP sensors, throttle bodies', icon: '📡', sortOrder: 11 },
    { name: 'Fuel System', slug: 'fuel-system', description: 'Injectors, fuel pumps, fuel rails, throttle bodies', icon: '⛽', sortOrder: 12 },
    { name: 'Transmission', slug: 'transmission', description: 'Gearbox parts, bearings, seals, synchros', icon: '⚙️', sortOrder: 13 },
    { name: 'Exhaust System', slug: 'exhaust-system', description: 'Mufflers, catalytic converters, pipes', icon: '💨', sortOrder: 14 },
    { name: 'EV Parts', slug: 'ev-parts', description: 'Battery packs, chargers, motor controllers, regen brakes', icon: '🔋', sortOrder: 15 },
    { name: 'Accessories', slug: 'accessories', description: 'Floor mats, seat covers, phone mounts, chargers', icon: '🎯', sortOrder: 16 },
    { name: 'Oils & Fluids', slug: 'oils-fluids', description: 'Engine oil, brake fluid, coolant, transmission fluid', icon: '🛢️', sortOrder: 17 },
    { name: 'Tools & Equipment', slug: 'tools-equipment', description: 'Wrenches, jack stands, diagnostic tools', icon: '🔨', sortOrder: 18 },
  ]);

  console.log(`${categories.length} categories created`);

  // ==================== VEHICLE BRANDS ====================
  const brands = await VehicleBrand.insertMany([
    { name: 'Honda', slug: 'honda', vehicleType: ['2-wheeler', 'car'] },
    { name: 'Toyota', slug: 'toyota', vehicleType: ['car', 'truck'] },
    { name: 'Maruti Suzuki', slug: 'maruti-suzuki', vehicleType: ['car'] },
    { name: 'Hyundai', slug: 'hyundai', vehicleType: ['car'] },
    { name: 'Tata', slug: 'tata', vehicleType: ['car', 'truck', 'ev'] },
    { name: 'Mahindra', slug: 'mahindra', vehicleType: ['car', 'truck', 'tractor'] },
    { name: 'Bajaj', slug: 'bajaj', vehicleType: ['2-wheeler', 'three-wheeler'] },
    { name: 'Royal Enfield', slug: 'royal-enfield', vehicleType: ['2-wheeler'] },
    { name: 'Yamaha', slug: 'yamaha', vehicleType: ['2-wheeler'] },
    { name: 'KTM', slug: 'ktm', vehicleType: ['2-wheeler'] },
    { name: 'TVS', slug: 'tvs', vehicleType: ['2-wheeler', 'three-wheeler'] },
    { name: 'Hero', slug: 'hero', vehicleType: ['2-wheeler'] },
    { name: 'Suzuki', slug: 'suzuki', vehicleType: ['2-wheeler', 'car'] },
    { name: 'Kia', slug: 'kia', vehicleType: ['car'] },
    { name: 'MG', slug: 'mg', vehicleType: ['car'] },
    { name: 'Ashok Leyland', slug: 'ashok-leyland', vehicleType: ['truck', 'bus'] },
    { name: 'Eicher', slug: 'eicher', vehicleType: ['truck', 'bus'] },
    { name: 'Force Motors', slug: 'force-motors', vehicleType: ['bus', 'three-wheeler'] },
    { name: 'Ola Electric', slug: 'ola-electric', vehicleType: ['2-wheeler', 'ev'] },
    { name: 'Ather', slug: 'ather', vehicleType: ['2-wheeler', 'ev'] },
    { name: 'Tata Motors EV', slug: 'tata-motors-ev', vehicleType: ['ev', 'car'] },
    { name: 'John Deere', slug: 'john-deere', vehicleType: ['tractor'] },
    { name: 'Swaraj', slug: 'swaraj', vehicleType: ['tractor'] },
    { name: 'Sonalika', slug: 'sonalika', vehicleType: ['tractor'] },
  ]);

  console.log(`${brands.length} brands created`);

  // ==================== VEHICLE MODELS ====================
  const brandMap: Record<string, mongoose.Types.ObjectId> = {};
  brands.forEach((b) => { brandMap[b.slug] = b._id; });

  const models = await VehicleModel.insertMany([
    // Honda
    { name: 'Activa 6G', slug: 'honda-activa-6g', brand: brandMap['honda'], vehicleType: '2-wheeler' },
    { name: 'CB Shine', slug: 'honda-cb-shine', brand: brandMap['honda'], vehicleType: '2-wheeler' },
    { name: 'SP 125', slug: 'honda-sp-125', brand: brandMap['honda'], vehicleType: '2-wheeler' },
    { name: 'City', slug: 'honda-city', brand: brandMap['honda'], vehicleType: 'car' },
    { name: 'Amaze', slug: 'honda-amaze', brand: brandMap['honda'], vehicleType: 'car' },
    { name: 'WR-V', slug: 'honda-wrv', brand: brandMap['honda'], vehicleType: 'car' },
    // Toyota
    { name: 'Innova Crysta', slug: 'toyota-innova-crysta', brand: brandMap['toyota'], vehicleType: 'car' },
    { name: 'Fortuner', slug: 'toyota-fortuner', brand: brandMap['toyota'], vehicleType: 'car' },
    { name: 'Glanza', slug: 'toyota-glanza', brand: brandMap['toyota'], vehicleType: 'car' },
    { name: 'Hilux', slug: 'toyota-hilux', brand: brandMap['toyota'], vehicleType: 'truck' },
    // Maruti Suzuki
    { name: 'Swift', slug: 'maruti-swift', brand: brandMap['maruti-suzuki'], vehicleType: 'car' },
    { name: 'Alto K10', slug: 'maruti-alto-k10', brand: brandMap['maruti-suzuki'], vehicleType: 'car' },
    { name: 'Brezza', slug: 'maruti-brezza', brand: brandMap['maruti-suzuki'], vehicleType: 'car' },
    { name: 'Ertiga', slug: 'maruti-ertiga', brand: brandMap['maruti-suzuki'], vehicleType: 'car' },
    { name: 'WagonR', slug: 'maruti-wagonr', brand: brandMap['maruti-suzuki'], vehicleType: 'car' },
    // Hyundai
    { name: 'Creta', slug: 'hyundai-creta', brand: brandMap['hyundai'], vehicleType: 'car' },
    { name: 'i20', slug: 'hyundai-i20', brand: brandMap['hyundai'], vehicleType: 'car' },
    { name: 'Venue', slug: 'hyundai-venue', brand: brandMap['hyundai'], vehicleType: 'car' },
    { name: 'Verna', slug: 'hyundai-verna', brand: brandMap['hyundai'], vehicleType: 'car' },
    // Tata
    { name: 'Nexon', slug: 'tata-nexon', brand: brandMap['tata'], vehicleType: 'car' },
    { name: 'Punch', slug: 'tata-punch', brand: brandMap['tata'], vehicleType: 'car' },
    { name: 'Harrier', slug: 'tata-harrier', brand: brandMap['tata'], vehicleType: 'car' },
    { name: 'Tiago', slug: 'tata-tiago', brand: brandMap['tata'], vehicleType: 'car' },
    { name: 'Nexon EV', slug: 'tata-nexon-ev', brand: brandMap['tata-motors-ev'], vehicleType: 'ev' },
    // Mahindra
    { name: 'Thar', slug: 'mahindra-thar', brand: brandMap['mahindra'], vehicleType: 'car' },
    { name: 'Scorpio-N', slug: 'mahindra-scorpio-n', brand: brandMap['mahindra'], vehicleType: 'car' },
    { name: 'XUV700', slug: 'mahindra-xuv700', brand: brandMap['mahindra'], vehicleType: 'car' },
    { name: 'Bolero', slug: 'mahindra-bolero', brand: brandMap['mahindra'], vehicleType: 'car' },
    // Bajaj
    { name: 'Pulsar NS200', slug: 'bajaj-pulsar-ns200', brand: brandMap['bajaj'], vehicleType: '2-wheeler' },
    { name: 'Dominar 400', slug: 'bajaj-dominar-400', brand: brandMap['bajaj'], vehicleType: '2-wheeler' },
    { name: 'Platina', slug: 'bajaj-platina', brand: brandMap['bajaj'], vehicleType: '2-wheeler' },
    { name: 'RE', slug: 'bajaj-re', brand: brandMap['bajaj'], vehicleType: 'three-wheeler' },
    // Royal Enfield
    { name: 'Classic 350', slug: 're-classic-350', brand: brandMap['royal-enfield'], vehicleType: '2-wheeler' },
    { name: 'Bullet 350', slug: 're-bullet-350', brand: brandMap['royal-enfield'], vehicleType: '2-wheeler' },
    { name: 'Hunter 350', slug: 're-hunter-350', brand: brandMap['royal-enfield'], vehicleType: '2-wheeler' },
    { name: 'Intercepter 650', slug: 're-interceptor-650', brand: brandMap['royal-enfield'], vehicleType: '2-wheeler' },
    // Yamaha
    { name: 'MT-15', slug: 'yamaha-mt-15', brand: brandMap['yamaha'], vehicleType: '2-wheeler' },
    { name: 'FZ-X', slug: 'yamaha-fzx', brand: brandMap['yamaha'], vehicleType: '2-wheeler' },
    { name: 'R15', slug: 'yamaha-r15', brand: brandMap['yamaha'], vehicleType: '2-wheeler' },
    // KTM
    { name: 'Duke 390', slug: 'ktm-duke-390', brand: brandMap['ktm'], vehicleType: '2-wheeler' },
    { name: 'RC 390', slug: 'ktm-rc-390', brand: brandMap['ktm'], vehicleType: '2-wheeler' },
    // TVS
    { name: 'Jupiter', slug: 'tvs-jupiter', brand: brandMap['tvs'], vehicleType: '2-wheeler' },
    { name: 'Apache RTR 160', slug: 'tvs-apache-rtr-160', brand: brandMap['tvs'], vehicleType: '2-wheeler' },
    // Hero
    { name: 'Splendor Plus', slug: 'hero-splendor-plus', brand: brandMap['hero'], vehicleType: '2-wheeler' },
    { name: 'HF Deluxe', slug: 'hero-hf-deluxe', brand: brandMap['hero'], vehicleType: '2-wheeler' },
    // Kia
    { name: 'Seltos', slug: 'kia-seltos', brand: brandMap['kia'], vehicleType: 'car' },
    { name: 'Sonet', slug: 'kia-sonet', brand: brandMap['kia'], vehicleType: 'car' },
    { name: 'Carens', slug: 'kia-carens', brand: brandMap['kia'], vehicleType: 'car' },
    // MG
    { name: 'Hector', slug: 'mg-hector', brand: brandMap['mg'], vehicleType: 'car' },
    { name: 'Astro', slug: 'mg-astro', brand: brandMap['mg'], vehicleType: 'car' },
    // EV
    { name: 'S1 Pro', slug: 'ola-s1-pro', brand: brandMap['ola-electric'], vehicleType: '2-wheeler' },
    { name: 'Ather 450X', slug: 'ather-450x', brand: brandMap['ather'], vehicleType: '2-wheeler' },
    { name: 'Tigor EV', slug: 'tata-tigor-ev', brand: brandMap['tata-motors-ev'], vehicleType: 'ev' },
    // Tractors
    { name: 'John Deere 5310', slug: 'jd-5310', brand: brandMap['john-deere'], vehicleType: 'tractor' },
    { name: 'Swaraj 855 FE', slug: 'swaraj-855-fe', brand: brandMap['swaraj'], vehicleType: 'tractor' },
    { name: 'Sonalika DI 750', slug: 'sonalika-di-750', brand: brandMap['sonalika'], vehicleType: 'tractor' },
    // Trucks
    { name: 'Ace Gold', slug: 'tata-ace-gold', brand: brandMap['tata'], vehicleType: 'truck' },
    { name: 'LPT 1613', slug: 'ashok-leyland-lpt-1613', brand: brandMap['ashok-leyland'], vehicleType: 'truck' },
    { name: 'Pro 2049', slug: 'eicher-pro-2049', brand: brandMap['eicher'], vehicleType: 'truck' },
  ]);

  console.log(`${models.length} models created`);

  // ==================== VEHICLE VARIANTS ====================
  const modelMap: Record<string, mongoose.Types.ObjectId> = {};
  models.forEach((m) => { modelMap[m.slug] = m._id; });

  const variants = await VehicleVariant.insertMany([
    // Honda Activa 6G
    { name: 'Standard', slug: 'activa-6g-standard', vehicleModel: modelMap['honda-activa-6g'], yearFrom: 2021, yearTo: 2024, engineType: 'Single Cylinder', engineCC: 109.51, fuelType: 'petrol' },
    { name: 'Premium', slug: 'activa-6g-premium', vehicleModel: modelMap['honda-activa-6g'], yearFrom: 2021, yearTo: 2024, engineType: 'Single Cylinder', engineCC: 109.51, fuelType: 'petrol' },
    // Honda City
    { name: 'V CVT', slug: 'honda-city-v-cvt', vehicleModel: modelMap['honda-city'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 4', engineCC: 1498, fuelType: 'petrol', transmission: 'cvt' },
    { name: 'VX MT', slug: 'honda-city-vx-mt', vehicleModel: modelMap['honda-city'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 4', engineCC: 1498, fuelType: 'petrol', transmission: 'manual' },
    { name: 'Z CVT', slug: 'honda-city-z-cvt', vehicleModel: modelMap['honda-city'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 4', engineCC: 1498, fuelType: 'petrol', transmission: 'cvt' },
    // Toyota Innova
    { name: 'GX MT', slug: 'innova-crysta-gx-mt', vehicleModel: modelMap['toyota-innova-crysta'], yearFrom: 2016, yearTo: 2024, engineType: 'Inline 4', engineCC: 2393, fuelType: 'diesel', transmission: 'manual' },
    { name: 'ZX AT', slug: 'innova-crysta-zx-at', vehicleModel: modelMap['toyota-innova-crysta'], yearFrom: 2016, yearTo: 2024, engineType: 'Inline 4', engineCC: 2393, fuelType: 'diesel', transmission: 'automatic' },
    // Swift
    { name: 'LXi', slug: 'swift-lxi', vehicleModel: modelMap['maruti-swift'], yearFrom: 2018, yearTo: 2024, engineType: 'Inline 3', engineCC: 1197, fuelType: 'petrol', transmission: 'manual' },
    { name: 'ZXi AT', slug: 'swift-zxi-at', vehicleModel: modelMap['maruti-swift'], yearFrom: 2018, yearTo: 2024, engineType: 'Inline 3', engineCC: 1197, fuelType: 'petrol', transmission: 'automatic' },
    // Creta
    { name: 'E', slug: 'creta-e', vehicleModel: modelMap['hyundai-creta'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 4', engineCC: 1497, fuelType: 'petrol', transmission: 'manual' },
    { name: 'S(O) DCT', slug: 'creta-so-dct', vehicleModel: modelMap['hyundai-creta'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 4', engineCC: 1497, fuelType: 'petrol', transmission: 'automatic' },
    // Nexon
    { name: 'XMS', slug: 'nexon-xms', vehicleModel: modelMap['tata-nexon'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 3', engineCC: 1199, fuelType: 'petrol', transmission: 'manual' },
    { name: 'XZA Plus', slug: 'nexon-xza-plus', vehicleModel: modelMap['tata-nexon'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 3', engineCC: 1199, fuelType: 'petrol', transmission: 'amt' },
    // Nexon EV
    { name: 'Empowered', slug: 'nexon-ev-empowered', vehicleModel: modelMap['tata-nexon-ev'], yearFrom: 2022, yearTo: 2024, engineType: 'Electric Motor', engineCC: 0, fuelType: 'electric' },
    // Thar
    { name: 'AX (O) 4WD MT', slug: 'thar-ax-o-4wd', vehicleModel: modelMap['mahindra-thar'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 4', engineCC: 2184, fuelType: 'diesel', transmission: 'manual' },
    // Pulsar NS200
    { name: 'Standard', slug: 'pulsar-ns200-std', vehicleModel: modelMap['bajaj-pulsar-ns200'], yearFrom: 2018, yearTo: 2024, engineType: 'Single Cylinder', engineCC: 199.5, fuelType: 'petrol' },
    // Classic 350
    { name: 'Standard', slug: 'classic-350-std', vehicleModel: modelMap['re-classic-350'], yearFrom: 2021, yearTo: 2024, engineType: 'Single Cylinder', engineCC: 349, fuelType: 'petrol' },
    // MT-15
    { name: 'Version 2.0', slug: 'mt15-v2', vehicleModel: modelMap['yamaha-mt-15'], yearFrom: 2021, yearTo: 2024, engineType: 'Single Cylinder', engineCC: 155, fuelType: 'petrol' },
    // Duke 390
    { name: 'Standard', slug: 'duke-390-std', vehicleModel: modelMap['ktm-duke-390'], yearFrom: 2017, yearTo: 2024, engineType: 'Single Cylinder', engineCC: 373.3, fuelType: 'petrol' },
    // Kia Seltos
    { name: 'HTK Plus', slug: 'seltos-htk-plus', vehicleModel: modelMap['kia-seltos'], yearFrom: 2019, yearTo: 2024, engineType: 'Inline 4', engineCC: 1497, fuelType: 'petrol', transmission: 'manual' },
    { name: 'GT Line DCT', slug: 'seltos-gt-line-dct', vehicleModel: modelMap['kia-seltos'], yearFrom: 2019, yearTo: 2024, engineType: 'Inline 4', engineCC: 1497, fuelType: 'petrol', transmission: 'automatic' },
    // Scorpio-N
    { name: 'Z2 MT', slug: 'scorpio-n-z2', vehicleModel: modelMap['mahindra-scorpio-n'], yearFrom: 2022, yearTo: 2024, engineType: 'Inline 4', engineCC: 2184, fuelType: 'diesel', transmission: 'manual' },
    // Ather 450X
    { name: 'Gen 3', slug: 'ather-450x-gen3', vehicleModel: modelMap['ather-450x'], yearFrom: 2022, yearTo: 2024, engineType: 'Electric Motor', engineCC: 0, fuelType: 'electric' },
    // Ola S1 Pro
    { name: 'Gen 2', slug: 'ola-s1-pro-gen2', vehicleModel: modelMap['ola-s1-pro'], yearFrom: 2023, yearTo: 2024, engineType: 'Electric Motor', engineCC: 0, fuelType: 'electric' },
    // Tata Ace
    { name: 'Gold Petrol', slug: 'ace-gold-petrol', vehicleModel: modelMap['tata-ace-gold'], yearFrom: 2020, yearTo: 2024, engineType: 'Inline 2', engineCC: 694, fuelType: 'petrol', transmission: 'manual' },
    // John Deere
    { name: 'PowerPro', slug: 'jd-5310-powerpro', vehicleModel: modelMap['jd-5310'], yearFrom: 2018, yearTo: 2024, engineType: 'Inline 3', engineCC: 3000, fuelType: 'diesel', transmission: 'manual' },
  ]);

  console.log(`${variants.length} variants created`);

  console.log('\n✅ Seed completed successfully!');
  console.log('\nAccounts:');
  console.log('  Admin:  admin@vehiclepart.com  / admin123');
  console.log('  Seller: seller@vehiclepart.com / seller123');
  console.log('  User:   user@vehiclepart.com   / user123');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
