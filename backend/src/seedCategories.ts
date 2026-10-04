/**
 * Category seed — REAL spare-parts taxonomy for MongoDB.
 *
 * Run: npm run seed:categories   (from backend/)
 *
 * - Connects to the configured MONGODB_URI (same as the server).
 * - UPSERTS by slug (fallback: exact name) — safe to run repeatedly,
 *   never duplicates, never touches users/products/vehicles.
 * - Reactivates the seeded categories (isActive: true).
 * - Deactivates exact-name duplicates so customers never see two
 *   categories with the same name.
 * - Repairs products whose `category` ref is missing/dangling by matching
 *   the product name against real category names (best-effort; valid refs
 *   are never touched).
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './config/db';
import Category from './models/Category';
import Product from './models/Product';
import { generateSlug } from './utils/helpers';

/* ------------------------------------------------------------------ */
/* Data: 20 main categories with real spare-part subcategories         */
/* ------------------------------------------------------------------ */

interface SeedChild {
  name: string;
  description: string;
}

interface SeedMain {
  name: string;
  icon: string;
  description: string;
  children: SeedChild[];
}

const MAIN_CATEGORIES: SeedMain[] = [
  {
    name: 'Engine Parts',
    icon: '⚙️',
    description: 'Pistons, gaskets, valves, timing components and more engine spares',
    children: [
      { name: 'Pistons & Rings', description: 'Pistons, piston rings and pins' },
      { name: 'Gaskets & Seals', description: 'Head gaskets, oil seals and O-rings' },
      { name: 'Valves & Guides', description: 'Intake/exhaust valves, springs and guides' },
      { name: 'Timing Belt & Chain', description: 'Timing belts, chains, tensioners and kits' },
      { name: 'Cylinder Head', description: 'Cylinder heads and head components' },
      { name: 'Crankshaft & Bearings', description: 'Crankshafts, main and rod bearings' },
      { name: 'Engine Mounts', description: 'Engine and gearbox mounting brackets' },
    ],
  },
  {
    name: 'Brake System',
    icon: '🛑',
    description: 'Brake pads, discs, drums, calipers, shoes and brake fluid',
    children: [
      { name: 'Brake Pads', description: 'Disc brake pads for cars and bikes' },
      { name: 'Brake Discs & Rotors', description: 'Brake discs and rotors' },
      { name: 'Brake Drums', description: 'Brake drums for drum brake systems' },
      { name: 'Calipers', description: 'Brake calipers and caliper rebuild kits' },
      { name: 'Brake Shoes', description: 'Brake shoes for drum brakes' },
      { name: 'Brake Lines & Hoses', description: 'Brake pipes, hoses and fittings' },
      { name: 'Brake Fluid', description: 'DOT brake fluid' },
    ],
  },
  {
    name: 'Clutch & Transmission',
    icon: '🔧',
    description: 'Clutch plates, bearings, flywheels and gearbox parts',
    children: [
      { name: 'Clutch Plates & Discs', description: 'Clutch plates and friction discs' },
      { name: 'Clutch Bearings & Cables', description: 'Release bearings, cables and forks' },
      { name: 'Flywheels & Clutch Kits', description: 'Flywheels, pressure plates and kits' },
      { name: 'Gearbox Parts', description: 'Gears, shafts, synchros and bearings' },
      { name: 'Gear Levers & Cables', description: 'Shift levers, linkage and cables' },
    ],
  },
  {
    name: 'Filters',
    icon: '🌀',
    description: 'Oil, air, fuel and cabin filters',
    children: [
      { name: 'Oil Filters', description: 'Engine oil filters and filter elements' },
      { name: 'Air Filters', description: 'Engine air filters and panel filters' },
      { name: 'Fuel Filters', description: 'Inline and in-tank fuel filters' },
      { name: 'Cabin Filters', description: 'Cabin/AC pollen and dust filters' },
    ],
  },
  {
    name: 'Electrical & Electronics',
    icon: '⚡',
    description: 'Alternators, starters, sensors, ECU and wiring',
    children: [
      { name: 'Alternators & Starters', description: 'Alternators, starter motors and parts' },
      { name: 'Spark Plugs', description: 'Spark plugs and ignition coils' },
      { name: 'Fuses & Relays', description: 'Fuses, relays and fuse boxes' },
      { name: 'Wiring & Harnesses', description: 'Wiring looms, connectors and clips' },
      { name: 'ECUs & Control Units', description: 'Engine computers and control modules' },
      { name: 'Sensors', description: 'MAP, O2, crank and speed sensors' },
      { name: 'Switches & Buttons', description: 'Switches, stalks and control buttons' },
    ],
  },
  {
    name: 'Suspension & Steering',
    icon: '🚗',
    description: 'Shocks, struts, springs, ball joints and steering parts',
    children: [
      { name: 'Shock Absorbers', description: 'Front and rear shock absorbers' },
      { name: 'Struts & Springs', description: 'Strut assemblies and coil springs' },
      { name: 'Control Arms & Bushings', description: 'Control arms, arms bushes and links' },
      { name: 'Ball Joints & Tie Rods', description: 'Ball joints, tie rods and end links' },
      { name: 'Steering Racks & Columns', description: 'Steering racks, columns and joints' },
      { name: 'Stabiliser Links & Bars', description: 'Anti-roll bars and stabiliser links' },
    ],
  },
  {
    name: 'Lights & Lighting',
    icon: '💡',
    description: 'Headlights, tail lights, indicators, bulbs and LEDs',
    children: [
      { name: 'Headlights', description: 'Headlamp assemblies for cars and bikes' },
      { name: 'Tail Lights', description: 'Rear tail and brake light assemblies' },
      { name: 'Turn Indicators', description: 'Indicator and blinker lamps' },
      { name: 'Fog Lights', description: 'Fog and auxiliary lamps' },
      { name: 'Bulbs & LED', description: 'H4, H7, LED and halogen bulbs' },
      { name: 'Light Assemblies & Lens', description: 'Lamps, lenses and light housings' },
    ],
  },
  {
    name: 'Cooling System',
    icon: '❄️',
    description: 'Radiators, water pumps, thermostats and hoses',
    children: [
      { name: 'Radiators', description: 'Radiators and radiator cores' },
      { name: 'Water Pumps', description: 'Engine water pumps and impellers' },
      { name: 'Thermostats', description: 'Thermostats and thermostat housings' },
      { name: 'Coolant Hoses & Clamps', description: 'Radiator hoses, pipes and clamps' },
      { name: 'Cooling Fans', description: 'Electric and mechanical cooling fans' },
      { name: 'Radiator Caps & Reservoirs', description: 'Pressure caps and coolant tanks' },
    ],
  },
  {
    name: 'Fuel System',
    icon: '⛽',
    description: 'Fuel pumps, injectors, rails and throttle bodies',
    children: [
      { name: 'Fuel Pumps', description: 'In-tank, in-line and lift pumps' },
      { name: 'Fuel Injectors', description: 'Injectors, nozzles and injector seals' },
      { name: 'Throttle Bodies', description: 'Throttle bodies and butterflies' },
      { name: 'Fuel Rails & Lines', description: 'Fuel rails, pipes and quick connectors' },
      { name: 'Carburetors', description: 'Carburetors, jets and rebuild parts' },
    ],
  },
  {
    name: 'Body & Exterior',
    icon: '🚙',
    description: 'Bumpers, panels, mirrors, grilles and body parts',
    children: [
      { name: 'Bumpers', description: 'Front and rear bumpers and stays' },
      { name: 'Fenders & Side Panels', description: 'Fenders, quarter panels and side skirts' },
      { name: 'Doors & Hoods', description: 'Doors, bonnets, latches and hinges' },
      { name: 'Side Mirrors', description: 'ORVMs, mirror glass and covers' },
      { name: 'Grilles & Emblems', description: 'Front grilles, badges and emblems' },
      { name: 'Body Moldings & Trim', description: 'Cladding, mouldings and trim strips' },
    ],
  },
  {
    name: 'Tyres & Wheels',
    icon: '🛞',
    description: 'Tyres, alloy wheels, rims and wheel hardware',
    children: [
      { name: 'Tyres', description: 'Car, bike and scooter tyres' },
      { name: 'Alloy Wheels', description: 'Alloy wheels in factory fitments' },
      { name: 'Steel Rims', description: 'Steel wheels and rim sets' },
      { name: 'Wheel Nuts & Hub Caps', description: 'Lug nuts, caps and hub parts' },
    ],
  },
  {
    name: 'AC & Heating',
    icon: '🌡️',
    description: 'Compressors, condensers, blower motors and heater parts',
    children: [
      { name: 'AC Compressors', description: 'Compressors, clutches and seals' },
      { name: 'Condensers', description: 'AC condensers and dryer bottles' },
      { name: 'Evaporators & Cooling Coils', description: 'Evaporator cores and cooling coils' },
      { name: 'Blower & Heater Motors', description: 'Blower motors, fans and resistors' },
      { name: 'Heater Core & Controls', description: 'Heater cores, valves and controls' },
      { name: 'AC Gas & Oils', description: 'Refrigerant gas and compressor oils' },
    ],
  },
  {
    name: 'Exhaust System',
    icon: '💨',
    description: 'Mufflers, catalytic converters, manifolds and pipes',
    children: [
      { name: 'Mufflers & Silencers', description: 'Mufflers, silencers and tail pipes' },
      { name: 'Catalytic Converters', description: 'Catalytic converters and inserts' },
      { name: 'Exhaust Manifolds', description: 'Manifolds and manifold gaskets' },
      { name: 'Downpipes & Flex Pipes', description: 'Downpipes, flex pipes and joints' },
      { name: 'Exhaust Gaskets & Mounts', description: 'Gaskets, hangers and rubber mounts' },
    ],
  },
  {
    name: 'Battery & Charging',
    icon: '🔋',
    description: 'Batteries, terminals, chargers and battery accessories',
    children: [
      { name: 'Car Batteries', description: 'MF and conventional car batteries' },
      { name: 'Two-Wheeler Batteries', description: 'Bike and scooter batteries' },
      { name: 'Battery Terminals & Cables', description: 'Terminals, clamps and cable sets' },
      { name: 'Battery Chargers & Jump Starters', description: 'Chargers, jump starters and accessories' },
      { name: 'Battery Holders & Covers', description: 'Trays, brackets and battery covers' },
    ],
  },
  {
    name: 'Accessories',
    icon: '🎯',
    description: 'Floor mats, seat covers, mounts, covers and car care',
    children: [
      { name: 'Floor Mats & Liners', description: 'Rubber and carpet floor mats' },
      { name: 'Seat Covers', description: 'Fabric, leatherette and custom seat covers' },
      { name: 'Body & Bike Covers', description: 'Car and two-wheeler covers' },
      { name: 'Mobile & GPS Mounts', description: 'Phone mounts, holders and chargers' },
      { name: 'Perfumes & Air Fresheners', description: 'Car perfumes, gels and fresheners' },
      { name: 'Mud Flaps', description: 'Mud flaps and splash guards' },
    ],
  },
  {
    name: 'Tools & Garage Equipment',
    icon: '🔨',
    description: 'Hand tools, jacks, scanners and workshop equipment',
    children: [
      { name: 'Hand Tools', description: 'Screwdrivers, pliers and hex keys' },
      { name: 'Socket & Wrench Sets', description: 'Socket sets, spanners and ratchets' },
      { name: 'Car Jacks & Stands', description: 'Floor jacks, bottle jacks and stands' },
      { name: 'Diagnostic Scanners', description: 'OBD scanners and diagnostic tools' },
      { name: 'Air Compressors', description: 'Portable and workshop air compressors' },
      { name: 'Garage Storage & Trolleys', description: 'Tool trolleys, boxes and storage' },
    ],
  },
  {
    name: 'Lubricants & Fluids',
    icon: '🛢️',
    description: 'Engine oils, gear oils, coolants, brake fluid and greases',
    children: [
      { name: 'Engine Oils', description: 'Synthetic, semi-synthetic and mineral oils' },
      { name: 'Gear Oils', description: 'Manual and differential gear oils' },
      { name: 'Brake Fluids', description: 'DOT 3, DOT 4 and DOT 5.1 fluid' },
      { name: 'Coolants', description: 'Coolant concentrates and ready-mix' },
      { name: 'Greases', description: 'Lithium, marine and bearing greases' },
      { name: 'Car Care Chemicals', description: 'Shampoos, polishes and degreasers' },
    ],
  },
  {
    name: 'Wipers & Washer System',
    icon: '🌧️',
    description: 'Wiper blades, motors, washer pumps and fluid',
    children: [
      { name: 'Wiper Blades', description: 'Front and rear wiper blades' },
      { name: 'Wiper Arms & Motors', description: 'Wiper arms, linkages and motors' },
      { name: 'Washer Pumps & Nozzles', description: 'Washer pumps, jets and hoses' },
      { name: 'Washer Fluid', description: 'Glass wash fluid and concentrates' },
    ],
  },
  {
    name: 'Interior Parts',
    icon: '🪑',
    description: 'Seats, dashboard, trim, pedals and interior components',
    children: [
      { name: 'Seat Parts & Rails', description: 'Seat frames, rails and adjustment parts' },
      { name: 'Dashboard & Console', description: 'Dash panels, consoles and trim' },
      { name: 'Steering Wheels & Covers', description: 'Steering wheels, pads and covers' },
      { name: 'Pedals & Footrests', description: 'Pedal pads, accelerator and rest pads' },
      { name: 'Interior Mirrors', description: 'IRVMs and interior mirror parts' },
      { name: 'Door Handles & Trim', description: 'Inner handles, locks and trim clips' },
    ],
  },
  {
    name: 'Safety & Security',
    icon: '🛡️',
    description: 'Airbags, seat belts, alarms, horns and dash cams',
    children: [
      { name: 'Airbag Components', description: 'Airbags, clocksprings and sensors' },
      { name: 'Seat Belts & Anchors', description: 'Belts, retractors and buckles' },
      { name: 'Horns', description: 'Horns, relays and horn kits' },
      { name: 'Alarms & Immobilisers', description: 'Alarms, immobilisers and central locking' },
      { name: 'Dash Cameras', description: 'Dash cams and mounting kits' },
      { name: 'Safety Kits & Warning Triangles', description: 'First aid kits, triangles and reflectors' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Upsert one category: match by slug first, then by exact name.
 * Reactivates (isActive: true) and applies canonical fields.
 * Returns the document plus whether it was created or updated.
 */
async function upsertCategory(fields: {
  name: string;
  description: string;
  icon?: string;
  sortOrder: number;
  parent?: mongoose.Types.ObjectId;
}): Promise<{ id: mongoose.Types.ObjectId; created: boolean }> {
  const slug = generateSlug(fields.name);
  const payload: any = {
    name: fields.name,
    slug,
    description: fields.description,
    isActive: true,
    sortOrder: fields.sortOrder,
    // null (not undefined) so a doc adopted from child → main is re-rooted
    parent: fields.parent ?? null,
  };
  if (fields.icon !== undefined) payload.icon = fields.icon;

  let doc = await Category.findOne({ slug });
  if (!doc) {
    doc = await Category.findOne({
      name: { $regex: `^${escapeRe(fields.name)}$`, $options: 'i' },
    });
    // Adopted by name — move it to the canonical slug (slug lookup above
    // proved the slug is free, so this cannot hit the unique index).
    if (doc) doc.slug = slug;
  }

  if (doc) {
    doc.set(payload);
    if (doc.isModified()) await doc.save();
    return { id: doc._id as mongoose.Types.ObjectId, created: false };
  }

  const created = await Category.create(payload);
  return { id: created._id as mongoose.Types.ObjectId, created: true };
}

/* ------------------------------------------------------------------ */
/* Product category repair (dangling refs only)                        */
/* ------------------------------------------------------------------ */

// Main-category keyword fallbacks, most specific first.
const KEYWORD_RULES: Array<[RegExp, string]> = [
  [/brake|caliper|rotor/, 'Brake System'],
  [/light|lamp|bulb|led|headl|tail|indicator|fog/, 'Lights & Lighting'],
  [/wiper|washer/, 'Wipers & Washer System'],
  [/battery/, 'Battery & Charging'],
  [/\boil\b|grease|lubricant/, 'Lubricants & Fluids'],
  [/filter/, 'Filters'],
  [/clutch|gearbox|transmission|flywheel/, 'Clutch & Transmission'],
  [/tyre|tire|wheel|alloy|rim/, 'Tyres & Wheels'],
  [/radiator|coolant|thermostat|water pump/, 'Cooling System'],
  [/exhaust|muffler|silencer|catalytic/, 'Exhaust System'],
  [/fuel|injector|throttle|carburetor/, 'Fuel System'],
  [/suspension|shock|strut|steering|tie rod|ball joint|control arm/, 'Suspension & Steering'],
  [/\bac\b|air cond|compressor|condenser|blower/, 'AC & Heating'],
  [/bumper|fender|mirror|bonnet|hood|grille|molding|moulding|panel/, 'Body & Exterior'],
  [/floor mat|seat cover|bike cover|body cover|perfume|freshener|mud flap|phone mount|accessor/, 'Accessories'],
  [/tool|jack|spanner|wrench|scanner|diagnostic/, 'Tools & Garage Equipment'],
  [/airbag|seat belt|alarm|immobilis|dash cam|security|horn/, 'Safety & Security'],
  [/seat|dashboard|interior|pedal|glove|console/, 'Interior Parts'],
  [/engine|piston|gasket|valve|timing|crank|cylinder/, 'Engine Parts'],
];

/**
 * Best real category for a product name — only ACTIVE categories qualify
 * (products must be browsable by customers):
 * 1) subcategory whose name appears in the product name (longest wins,
 *    singular-tolerant: "Brake Pads" matches "...Brake Pad"),
 * 2) main category by keyword rules,
 * 3) null — nothing sensible, leave the product untouched.
 */
function guessCategory(productName: string, allDocs: any[]): any | null {
  const docs = allDocs.filter((d) => d.isActive);
  const hay = productName.toLowerCase();

  let bestChild: any = null;
  let bestLen = 0;
  for (const d of docs) {
    if (!d.parent) continue;
    const n = d.name.toLowerCase();
    const forms = [n, n.endsWith('s') ? n.slice(0, -1) : n];
    for (const form of forms) {
      if (form.length > bestLen && hay.includes(form)) {
        bestChild = d;
        bestLen = form.length;
      }
    }
  }
  if (bestChild) return bestChild;

  for (const [re, mainName] of KEYWORD_RULES) {
    if (re.test(hay)) {
      const main = docs.find((d) => !d.parent && d.name === mainName);
      if (main) return main;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

const seed = async () => {
  await connectDB();

  console.log('=== BEFORE ===');
  const beforeCount = await Category.countDocuments();
  const beforeList = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  console.log(`Categories in DB: ${beforeCount} (active: ${beforeList.filter((c) => c.isActive).length})`);
  for (const c of beforeList) {
    console.log(
      `  - ${c.name} [slug=${c.slug}] ${c.isActive ? 'ACTIVE' : 'inactive'}${c.parent ? ' (child)' : ' (main)'}`
    );
  }

  let created = 0;
  let updated = 0;
  const keptIdsByName = new Map<string, mongoose.Types.ObjectId>();

  // 1) Main categories (sortOrder = position in the requested list)
  const mainIds = new Map<string, mongoose.Types.ObjectId>();
  for (let i = 0; i < MAIN_CATEGORIES.length; i++) {
    const main = MAIN_CATEGORIES[i];
    const { id, created: wasCreated } = await upsertCategory({
      name: main.name,
      description: main.description,
      icon: main.icon,
      sortOrder: i + 1,
    });
    wasCreated ? created++ : updated++;
    mainIds.set(main.name, id);
    keptIdsByName.set(main.name.toLowerCase(), id);
  }

  // 2) Subcategories (sortOrder = position under their parent)
  for (const main of MAIN_CATEGORIES) {
    const parentId = mainIds.get(main.name);
    if (!parentId) continue;
    for (let i = 0; i < main.children.length; i++) {
      const child = main.children[i];
      const { id, created: wasCreated } = await upsertCategory({
        name: child.name,
        description: child.description,
        sortOrder: i + 1,
        parent: parentId,
      });
      wasCreated ? created++ : updated++;
      keptIdsByName.set(child.name.toLowerCase(), id);
    }
  }

  // 3) Deactivate exact-name duplicates (keep only the seeded document)
  let deactivated = 0;
  for (const [nameLower, keptId] of keptIdsByName) {
    const dupes = await Category.find({
      name: { $regex: `^${escapeRe(nameLower)}$`, $options: 'i' },
      _id: { $ne: keptId },
    });
    for (const d of dupes) {
      if (d.isActive) {
        d.isActive = false;
        await d.save();
        deactivated++;
        console.log(`  deactivated duplicate: "${d.name}" (slug=${d.slug})`);
      }
    }
  }

  console.log('\n=== SEED RESULT ===');
  console.log(`Created: ${created}, Updated (idempotent): ${updated}, Duplicate names deactivated: ${deactivated}`);

  // 4) Product category health — repair ONLY missing/dangling refs and
  //    refs pointing at inactive (hidden) categories
  const allCats = await Category.find().lean();
  const catById = new Map(allCats.map((c) => [String(c._id), c]));
  const products = await Product.find({}).select('name category').lean();

  let validRefs = 0;
  let repaired = 0;
  let unmatched = 0;
  for (const p of products) {
    const cur = p.category ? catById.get(String(p.category)) : undefined;
    if (cur && cur.isActive) {
      validRefs++;
      continue;
    }
    const guess = guessCategory(p.name, allCats);
    if (guess) {
      await Product.updateOne({ _id: p._id }, { $set: { category: guess._id } });
      repaired++;
      const why = !p.category
        ? 'missing'
        : !cur
          ? `dangling (${p.category})`
          : `inactive "${cur.name}"`;
      console.log(`  product "${p.name}": ${why} -> "${guess.name}"`);
    } else {
      unmatched++;
      console.log(`  product "${p.name}": NO sensible active category — left untouched`);
    }
  }
  console.log(
    `Products: ${products.length} total — valid category refs: ${validRefs}, repaired: ${repaired}, unmatched: ${unmatched}`
  );

  // 5) Final verification straight from MongoDB
  console.log('\n=== VERIFY (MongoDB) ===');
  const mains = await Category.find({ parent: null, isActive: true }).sort({ sortOrder: 1 }).lean();
  console.log(`Active main categories: ${mains.length}`);
  for (const m of mains) {
    const kids = await Category.countDocuments({ parent: m._id, isActive: true });
    console.log(`  ${String(m.sortOrder).padStart(2)}. ${m.icon} ${m.name} [${m.slug}] — ${kids} subcategories`);
  }
  const inactiveChildren = await Category.countDocuments({ parent: { $ne: null }, isActive: false });
  console.log(`Inactive subcategories: ${inactiveChildren}`);

  if (mains.length !== MAIN_CATEGORIES.length) {
    console.error(`\nERROR: expected ${MAIN_CATEGORIES.length} active main categories, found ${mains.length}`);
    await mongoose.connection.close();
    process.exit(1);
  }

  console.log('\n✅ Category seed completed successfully.');
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Category seed error:', err);
  process.exit(1);
});
