// Seed script: run via `bun run db:seed` or directly `bun src/lib/seed.ts`
// Creates RBAC users, service catalog, portfolio, books, inventory, sample quotes/orders/payments.

import { db } from './db';
import { hashPassword, createSessionToken } from './auth';
import { generateReference, generateTrackingToken } from './types';

async function main() {
  console.log('Seeding database...');

  // ---- Settings ----
  const settingsData = [
    ['company_name', 'Print & Publish Co.', 'general'],
    ['company_tagline', 'Publishing • Printing • Branding', 'general'],
    ['company_phone', '+254 700 000 000', 'general'],
    ['company_email', 'hello@printpublish.co.ke', 'general'],
    ['company_address', 'Nairobi, Kenya', 'general'],
    ['currency', 'KES', 'general'],
    ['tax_rate', '16', 'tax'],
    ['quote_validity_days', '14', 'quotes'],
    ['default_deposit_percent', '50', 'orders'],
    ['order_prefix', 'ORD', 'orders'],
    ['quote_prefix', 'QTR', 'quotes'],
    ['invoice_prefix', 'INV', 'orders'],
    ['receipt_prefix', 'RCT', 'orders'],
    ['customer_prefix', 'CUS', 'customers'],
    ['payment_prefix', 'PAY', 'payments'],
    ['job_prefix', 'JOB', 'production'],
    ['mpesa_environment', 'sandbox', 'mpesa'],
    ['mpesa_shortocode', '174379', 'mpesa'],
    ['sms_provider', 'africa_talking', 'sms'],
    ['whatsapp_provider', 'whatsapp_business', 'whatsapp'],
    ['email_from', 'hello@printpublish.co.ke', 'email'],
  ];
  for (const [key, value, group] of settingsData) {
    await db.setting.upsert({
      where: { key },
      update: {},
      create: { key, value, group },
    });
  }

  // ---- Service Categories ----
  const categories = [
    { name: 'Publishing', slug: 'publishing', description: 'Book publishing, editing, ISBN, cover design.', icon: 'BookOpen', sortOrder: 1 },
    { name: 'Printing', slug: 'printing', description: 'Digital & offset printing for documents, books, marketing.', icon: 'Printer', sortOrder: 2 },
    { name: 'Branding', slug: 'branding', description: 'Signage, vehicle branding, banners, stationery.', icon: 'Palette', sortOrder: 3 },
    { name: 'Cyber Services', slug: 'cyber', description: 'Typing, scanning, photocopy, online applications.', icon: 'Monitor', sortOrder: 4 },
  ];
  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    const rec = await db.serviceCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categoryMap[c.slug] = rec.id;
  }

  // ---- Services + configurable fields ----
  interface ServiceSeed {
    categorySlug: string; name: string; slug: string; description: string;
    pricingType: 'FIXED' | 'PER_UNIT' | 'PER_PAGE' | 'CUSTOM_QUOTE' | 'FORMULA';
    basePrice?: number; unitName?: string; estimatedDays?: number; requiresFile?: boolean; isFeatured?: boolean;
    fields?: { key: string; label: string; type: any; required?: boolean; options?: string[]; placeholder?: string; helpText?: string }[];
  }

  const services: ServiceSeed[] = [
    {
      categorySlug: 'printing', name: 'Document Printing', slug: 'document-printing',
      description: 'Black & white or colour printing of business documents, reports, forms, and certificates.',
      pricingType: 'PER_PAGE', basePrice: 5, unitName: 'page', estimatedDays: 1, requiresFile: true, isFeatured: true,
      fields: [
        { key: 'paper_type', label: 'Paper Type', type: 'SELECT', required: true, options: ['A4 (80gsm)', 'A4 (100gsm)', 'Letter', 'Legal'] },
        { key: 'print_mode', label: 'Print Mode', type: 'RADIO', required: true, options: ['Black & White', 'Colour'] },
        { key: 'sides', label: 'Sides', type: 'RADIO', required: true, options: ['Single-sided', 'Double-sided'] },
        { key: 'copies', label: 'Number of Copies', type: 'NUMBER', required: true, placeholder: 'e.g. 50' },
        { key: 'binding', label: 'Binding', type: 'SELECT', options: ['None', 'Stapled', 'Spiral', 'Perfect bound'] },
        { key: 'deadline', label: 'Required by', type: 'DATE' },
        { key: 'instructions', label: 'Special Instructions', type: 'TEXTAREA', placeholder: 'Any finishing, folding, or special requirements' },
      ],
    },
    {
      categorySlug: 'printing', name: 'Book Printing', slug: 'book-printing',
      description: 'Interior + cover printing for novels, school books, manuals, and journals.',
      pricingType: 'PER_UNIT', basePrice: 350, unitName: 'copy', estimatedDays: 7, requiresFile: true, isFeatured: true,
      fields: [
        { key: 'page_count', label: 'Page Count', type: 'NUMBER', required: true },
        { key: 'trim_size', label: 'Trim Size', type: 'SELECT', required: true, options: ['A5', 'B5', '5"x8"', '6"x9"', 'A4'] },
        { key: 'cover_type', label: 'Cover Type', type: 'SELECT', required: true, options: ['Softcover (matte)', 'Softcover (glossy)', 'Hardcover'] },
        { key: 'paper_type', label: 'Interior Paper', type: 'SELECT', required: true, options: ['White bond', 'Cream book', 'Newsprint'] },
        { key: 'binding', label: 'Binding', type: 'SELECT', required: true, options: ['Perfect bound', 'Saddle-stitched', 'Spiral', 'Case bound'] },
        { key: 'quantity', label: 'Quantity', type: 'NUMBER', required: true },
        { key: 'colour', label: 'Interior Colour', type: 'RADIO', options: ['Black & White', 'Colour'] },
        { key: 'deadline', label: 'Required by', type: 'DATE' },
      ],
    },
    {
      categorySlug: 'printing', name: 'Flyers & Posters', slug: 'flyers-posters',
      description: 'Marketing flyers, posters, and handbills in various sizes and finishes.',
      pricingType: 'PER_UNIT', basePrice: 25, unitName: 'piece', estimatedDays: 2, requiresFile: true,
      fields: [
        { key: 'size', label: 'Size', type: 'SELECT', required: true, options: ['A6', 'A5', 'A4', 'A3', 'A2', 'A1'] },
        { key: 'paper', label: 'Paper', type: 'SELECT', required: true, options: ['Art 135gsm', 'Art 170gsm', 'Art 250gsm', 'Bond 80gsm'] },
        { key: 'sides', label: 'Sides', type: 'RADIO', required: true, options: ['Single-sided', 'Double-sided'] },
        { key: 'finish', label: 'Finish', type: 'SELECT', options: ['Matte', 'Glossy', 'Uncoated'] },
        { key: 'quantity', label: 'Quantity', type: 'NUMBER', required: true },
      ],
    },
    {
      categorySlug: 'publishing', name: 'Book Publishing Package', slug: 'book-publishing',
      description: 'End-to-end publishing: editing, layout, cover design, ISBN, and first print run.',
      pricingType: 'CUSTOM_QUOTE', estimatedDays: 30, requiresFile: true, isFeatured: true,
      fields: [
        { key: 'book_title', label: 'Book Title', type: 'TEXT', required: true },
        { key: 'author_name', label: 'Author Name', type: 'TEXT', required: true },
        { key: 'genre', label: 'Genre', type: 'TEXT', placeholder: 'e.g. Fiction, Academic, Children' },
        { key: 'page_count', label: 'Estimated Page Count', type: 'NUMBER' },
        { key: 'isbn', label: 'ISBN Assistance Needed?', type: 'RADIO', options: ['Yes', 'No'] },
        { key: 'cover_design', label: 'Cover Design Needed?', type: 'RADIO', options: ['Yes', 'No'] },
        { key: 'editing', label: 'Editing Needed?', type: 'RADIO', options: ['Copy edit', 'Substantive edit', 'None'] },
        { key: 'trim_size', label: 'Trim Size', type: 'SELECT', options: ['A5', 'B5', '5"x8"', '6"x9"', 'A4'] },
        { key: 'quantity', label: 'First Print Run Quantity', type: 'NUMBER' },
        { key: 'deadline', label: 'Target Publication Date', type: 'DATE' },
        { key: 'notes', label: 'Additional Notes', type: 'TEXTAREA' },
      ],
    },
    {
      categorySlug: 'branding', name: 'Roll-up Banners', slug: 'rollup-banners',
      description: 'Pull-up roller banners for events, exhibitions, and promotions.',
      pricingType: 'PER_UNIT', basePrice: 2500, unitName: 'banner', estimatedDays: 3, requiresFile: true, isFeatured: true,
      fields: [
        { key: 'size', label: 'Size', type: 'SELECT', required: true, options: ['85x200cm', '100x200cm', '120x200cm'] },
        { key: 'material', label: 'Material', type: 'SELECT', required: true, options: ['Vinyl 13oz', 'Fabric'] },
        { key: 'finish', label: 'Finish', type: 'SELECT', options: ['Matte', 'Glossy'] },
        { key: 'stand', label: 'Stand Included?', type: 'RADIO', options: ['Yes', 'No'] },
        { key: 'quantity', label: 'Quantity', type: 'NUMBER', required: true },
      ],
    },
    {
      categorySlug: 'branding', name: 'Business Cards', slug: 'business-cards',
      description: 'Premium business cards in various finishes and quantities.',
      pricingType: 'PER_UNIT', basePrice: 15, unitName: 'card', estimatedDays: 2, requiresFile: true,
      fields: [
        { key: 'paper', label: 'Card Stock', type: 'SELECT', required: true, options: ['300gsm matte', '350gsm glossy', '300gsm linen', '300gsm soft-touch'] },
        { key: 'finish', label: 'Finishing', type: 'SELECT', options: ['None', 'Spot UV', 'Foil (gold)', 'Foil (silver)', 'Embossed'] },
        { key: 'sides', label: 'Sides', type: 'RADIO', required: true, options: ['Single-sided', 'Double-sided'] },
        { key: 'quantity', label: 'Quantity', type: 'NUMBER', required: true },
      ],
    },
    {
      categorySlug: 'branding', name: 'Vehicle Branding', slug: 'vehicle-branding',
      description: 'Full or partial vehicle wraps and branding for cars, vans, and trucks.',
      pricingType: 'CUSTOM_QUOTE', estimatedDays: 7, requiresFile: true,
      fields: [
        { key: 'vehicle_type', label: 'Vehicle Type', type: 'SELECT', required: true, options: ['Saloon car', 'SUV', 'Pickup', 'Van', 'Lorry', 'Motorbike'] },
        { key: 'coverage', label: 'Coverage', type: 'RADIO', required: true, options: ['Full wrap', 'Partial wrap', 'Decals only'] },
        { key: 'material', label: 'Material', type: 'SELECT', options: ['Cast vinyl', 'Calendered vinyl', 'Reflective'] },
        { key: 'installation', label: 'Installation Needed?', type: 'RADIO', options: ['Yes', 'No'] },
        { key: 'notes', label: 'Notes', type: 'TEXTAREA' },
      ],
    },
    {
      categorySlug: 'cyber', name: 'Typing & Document Formatting', slug: 'typing-formatting',
      description: 'Professional typing, transcription, and document formatting services.',
      pricingType: 'PER_PAGE', basePrice: 50, unitName: 'page', estimatedDays: 1,
      fields: [
        { key: 'document_type', label: 'Document Type', type: 'SELECT', required: true, options: ['CV', 'Letter', 'Report', 'Manuscript', 'Agreement', 'Other'] },
        { key: 'pages', label: 'Approx. Pages', type: 'NUMBER', required: true },
        { key: 'format', label: 'Output Format', type: 'SELECT', options: ['Word (.docx)', 'PDF', 'Both'] },
        { key: 'deadline', label: 'Required by', type: 'DATE' },
      ],
    },
    {
      categorySlug: 'cyber', name: 'Scanning & Photocopy', slug: 'scanning-photocopy',
      description: 'High-quality document scanning to PDF and photocopying services.',
      pricingType: 'PER_PAGE', basePrice: 5, unitName: 'page', estimatedDays: 0,
      fields: [
        { key: 'service_type', label: 'Service', type: 'RADIO', required: true, options: ['Scanning', 'Photocopy', 'Both'] },
        { key: 'pages', label: 'Number of Pages', type: 'NUMBER', required: true },
        { key: 'format', label: 'Output Format', type: 'SELECT', options: ['PDF', 'JPG', 'Both'] },
        { key: 'colour', label: 'Colour', type: 'RADIO', options: ['B&W', 'Colour'] },
      ],
    },
    {
      categorySlug: 'cyber', name: 'Online Applications & KRA', slug: 'online-applications',
      description: 'KRA PIN, returns, NSSF, NHIF, eCitizen, and online form assistance.',
      pricingType: 'FIXED', basePrice: 200, unitName: 'application', estimatedDays: 1,
      fields: [
        { key: 'service_type', label: 'Application Type', type: 'SELECT', required: true, options: ['KRA PIN', 'KRA Returns', 'NSSF', 'NHIF/SHIF', 'Driving Licence', 'Passport', 'Business Registration', 'Other'] },
        { key: 'notes', label: 'Notes', type: 'TEXTAREA' },
      ],
    },
  ];

  for (const s of services) {
    const categoryId = categoryMap[s.categorySlug];
    const existing = await db.service.findUnique({ where: { slug: s.slug } });
    if (existing) {
      await db.service.update({ where: { id: existing.id }, data: {
        categoryId, name: s.name, description: s.description,
        pricingType: s.pricingType, basePrice: s.basePrice, unitName: s.unitName,
        estimatedDays: s.estimatedDays, requiresFile: !!s.requiresFile,
        isFeatured: !!s.isFeatured, isActive: true,
      }});
      continue;
    }
    const svc = await db.service.create({ data: {
      categoryId, name: s.name, slug: s.slug, description: s.description,
      pricingType: s.pricingType, basePrice: s.basePrice, unitName: s.unitName,
      estimatedDays: s.estimatedDays, requiresFile: !!s.requiresFile,
      isFeatured: !!s.isFeatured, isActive: true, minimumQuantity: 1, requiresApproval: true,
    }});
    for (let i = 0; i < (s.fields?.length ?? 0); i++) {
      const f = s.fields![i];
      await db.serviceField.create({ data: {
        serviceId: svc.id, fieldKey: f.key, label: f.label, fieldType: f.type,
        isRequired: !!f.required, optionsJson: f.options ? JSON.stringify(f.options) : null,
        placeholder: f.placeholder ?? null, helpText: f.helpText ?? null, sortOrder: i, isActive: true,
      }});
    }
  }

  // ---- Users ----
  async function makeUser(name: string, email: string, role: any, phone?: string, password?: string) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return existing;
    return db.user.create({ data: {
      name, email, phone, role, status: 'ACTIVE', passwordHash: hashPassword(password || 'password123'),
      emailVerifiedAt: new Date(),
    }});
  }

  const admin = await makeUser('System Administrator', 'admin@printpublish.co.ke', 'SUPER_ADMIN', '+254700000001', 'admin123');
  const manager = await makeUser('Grace Mutiso', 'manager@printpublish.co.ke', 'MANAGER', '+254700000002');
  const sales = await makeUser('Peter Kamau', 'sales@printpublish.co.ke', 'SALES', '+254700000003');
  const production = await makeUser('John Mwangi', 'production@printpublish.co.ke', 'PRODUCTION', '+254700000004');
  const designer = await makeUser('Aisha Hassan', 'designer@printpublish.co.ke', 'DESIGNER', '+254700000005');
  const publisher = await makeUser('Daniel Otieno', 'publisher@printpublish.co.ke', 'PUBLISHER', '+254700000006');
  const inventory = await makeUser('Mary Wanjiru', 'inventory@printpublish.co.ke', 'INVENTORY_MANAGER', '+254700000007');
  const finance = await makeUser('Samuel Kiprop', 'finance@printpublish.co.ke', 'FINANCE', '+254700000008');

  // Customers
  const customersData = [
    { name: 'Jane Njeri', email: 'jane.njeri@example.com', phone: '+254711100100', type: 'INDIVIDUAL', firstName: 'Jane', lastName: 'Njeri', city: 'Nairobi', county: 'Nairobi' },
    { name: 'Faith Wanjiku', email: 'faith.wanjiku@example.com', phone: '+254711100101', type: 'INDIVIDUAL', firstName: 'Faith', lastName: 'Wanjiku', city: 'Nakuru', county: 'Nakuru' },
    { name: 'Bright Future Academy', email: 'info@brightfuture.ac.ke', phone: '+254711100102', type: 'INSTITUTION', businessName: 'Bright Future Academy', firstName: 'James', lastName: 'Ochieng', city: 'Nairobi', county: 'Nairobi' },
    { name: 'Grace Community Church', email: 'admin@gracechurch.or.ke', phone: '+254711100103', type: 'ORGANIZATION', businessName: 'Grace Community Church', firstName: 'Pastor', lastName: 'David', city: 'Eldoret', county: 'Uasin Gishu' },
    { name: 'Nexus Logistics Ltd', email: 'ops@nexuslogistics.co.ke', phone: '+254711100104', type: 'BUSINESS', businessName: 'Nexus Logistics Ltd', firstName: 'Caroline', lastName: 'Achieng', city: 'Nairobi', county: 'Nairobi' },
  ];
  const customers: any[] = [];
  for (let i = 0; i < customersData.length; i++) {
    const c = customersData[i];
    const user = await makeUser(c.name, c.email, 'CUSTOMER', c.phone);
    const customerNumber = generateReference('CUS', i + 1);
    const existing = await db.customer.findUnique({ where: { customerNumber } });
    if (existing) { customers.push(existing); continue; }
    const cust = await db.customer.create({ data: {
      userId: user.id, customerNumber, customerType: c.type as any,
      businessName: c.businessName ?? null, firstName: c.firstName, lastName: c.lastName,
      phone: c.phone, email: c.email, city: c.city, county: c.county, status: 'ACTIVE',
    }});
    customers.push(cust);
  }

  // Authors
  const authorsData = [
    { name: 'Faith Wanjiku', penName: 'F. Wanjiku', email: 'faith.wanjiku@example.com', phone: '+254711100101', bio: 'Author of inspirational fiction and children stories.' },
    { name: 'Prof. Henry Mbiti', penName: 'H. Mbiti', email: 'henry.mbiti@example.com', phone: '+254711100110', bio: 'Academic writer and historian.' },
  ];
  for (let i = 0; i < authorsData.length; i++) {
    const a = authorsData[i];
    const user = await makeUser(a.name, a.email, 'AUTHOR', a.phone);
    const authorNumber = generateReference('AUT', i + 1);
    const existing = await db.author.findUnique({ where: { authorNumber } });
    if (existing) continue;
    await db.author.create({ data: {
      userId: user.id, authorNumber, firstName: a.name.split(' ')[0], lastName: a.name.split(' ').slice(1).join(' '),
      penName: a.penName, email: a.email, phone: a.phone, bio: a.bio, status: 'active',
    }});
  }

  // ---- Books ----
  const booksData = [
    { authorEmail: 'faith.wanjiku@example.com', title: 'Whispers of the Savannah', subtitle: 'Stories from the heartland', genre: 'Fiction', language: 'English', pageCount: 248, coverType: 'Softcover (matte)', paperType: 'Cream book', format: '5"x8"', sellingPrice: 850, publicationStatus: 'PUBLISHED', isFeatured: true, isPublished: true },
    { authorEmail: 'faith.wanjiku@example.com', title: 'Moonlight Tales for Children', subtitle: 'A bedtime collection', genre: 'Children', language: 'English', pageCount: 96, coverType: 'Softcover (glossy)', paperType: 'White bond', format: 'A4', sellingPrice: 600, publicationStatus: 'PUBLISHED', isFeatured: true, isPublished: true },
    { authorEmail: 'henry.mbiti@example.com', title: 'Foundations of African History', subtitle: 'A modern perspective', genre: 'Academic', language: 'English', pageCount: 412, coverType: 'Hardcover', paperType: 'White bond', format: '6"x9"', sellingPrice: 2200, publicationStatus: 'PUBLISHED', isFeatured: true, isPublished: true },
    { authorEmail: 'henry.mbiti@example.com', title: 'The Trade Routes of East Africa', genre: 'History', language: 'English', pageCount: 320, coverType: 'Softcover (matte)', paperType: 'Cream book', format: '6"x9"', sellingPrice: 1500, publicationStatus: 'EDITING', isFeatured: false, isPublished: false },
  ];
  for (const b of booksData) {
    const authorUser = await db.user.findUnique({ where: { email: b.authorEmail } });
    if (!authorUser) continue;
    const author = await db.author.findUnique({ where: { userId: authorUser.id } });
    if (!author) continue;
    const existing = await db.book.findFirst({ where: { title: b.title, authorId: author.id } });
    if (existing) continue;
    await db.book.create({ data: {
      authorId: author.id, title: b.title, subtitle: b.subtitle ?? null,
      description: `${b.genre} book by ${author.firstName} ${author.lastName}.`,
      genre: b.genre, language: b.language, publicationStatus: b.publicationStatus as any,
      pageCount: b.pageCount, coverType: b.coverType, paperType: b.paperType, format: b.format,
      sellingPrice: b.sellingPrice, isFeatured: b.isFeatured, isPublished: b.isPublished,
      publicationDate: b.isPublished ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) : null,
    }});
  }

  // ---- Portfolio ----
  const portfolioData = [
    { title: 'Community Book Series', category: 'Books', clientName: 'Grace Community Church', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80', isFeatured: true },
    { title: 'Retail Brand Refresh', category: 'Branding', clientName: 'Nexus Logistics Ltd', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80', isFeatured: true },
    { title: 'Corporate Event Banners', category: 'Banners', clientName: 'Bright Future Academy', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80', isFeatured: true },
    { title: 'Annual Report Print Run', category: 'Printing', clientName: 'Nexus Logistics Ltd', image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80' },
    { title: 'School Textbooks Edition', category: 'Publishing', clientName: 'Bright Future Academy', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80' },
    { title: 'Conference Materials', category: 'Printing', clientName: 'Grace Community Church', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80' },
  ];
  for (const p of portfolioData) {
    const existing = await db.portfolioItem.findUnique({ where: { slug: p.title.toLowerCase().replace(/\s+/g, '-') } });
    if (existing) continue;
    await db.portfolioItem.create({ data: {
      title: p.title, slug: p.title.toLowerCase().replace(/\s+/g, '-'),
      category: p.category, description: `Project delivered for ${p.clientName}.`,
      imageUrl: p.image, clientName: p.clientName, isFeatured: p.isFeatured ?? false,
      isPublished: true, projectDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
    }});
  }

  // ---- Inventory ----
  const supplier = await db.supplier.findFirst() ?? await db.supplier.create({ data: {
    name: 'Nairobi Print Supplies Ltd', email: 'sales@nps.co.ke', phone: '+254720111222', contactPerson: 'Joseph Maina', address: 'Industrial Area, Nairobi',
  }});
  const inventoryData = [
    { sku: 'PAP-A4-80', name: 'A4 Bond Paper 80gsm', category: 'Paper', unit: 'reams', quantity: 145, reorderLevel: 30, unitCost: 650 },
    { sku: 'PAP-A4-100', name: 'A4 Bond Paper 100gsm', category: 'Paper', unit: 'reams', quantity: 22, reorderLevel: 20, unitCost: 850 },
    { sku: 'PAP-A3-80', name: 'A3 Bond Paper 80gsm', category: 'Paper', unit: 'reams', quantity: 48, reorderLevel: 15, unitCost: 1300 },
    { sku: 'INK-BLACK', name: 'Black Toner Cartridge', category: 'Ink', unit: 'pcs', quantity: 12, reorderLevel: 5, unitCost: 4500 },
    { sku: 'INK-CYAN', name: 'Cyan Toner Cartridge', category: 'Ink', unit: 'pcs', quantity: 4, reorderLevel: 5, unitCost: 4500 },
    { sku: 'BIND-SPIRAL-A4', name: 'Spiral Binding A4', category: 'Binding', unit: 'pcs', quantity: 320, reorderLevel: 50, unitCost: 15 },
    { sku: 'BIND-PERFECT', name: 'Perfect Binding Glue', category: 'Binding', unit: 'kg', quantity: 18, reorderLevel: 5, unitCost: 1200 },
    { sku: 'COVER-MATTE', name: 'Matte Cover Card 300gsm', category: 'Covers', unit: 'sheets', quantity: 480, reorderLevel: 100, unitCost: 45 },
    { sku: 'BANNER-VINYL', name: 'Vinyl Banner 13oz', category: 'Materials', unit: 'sqm', quantity: 65, reorderLevel: 20, unitCost: 350 },
    { sku: 'CARD-BIZ-300', name: 'Business Card Stock 300gsm', category: 'Covers', unit: 'sheets', quantity: 8, reorderLevel: 50, unitCost: 25 },
  ];
  for (const item of inventoryData) {
    const existing = await db.inventoryItem.findUnique({ where: { sku: item.sku } });
    if (existing) continue;
    await db.inventoryItem.create({ data: { ...item, supplierId: supplier.id, isActive: true }});
  }

  // ---- Sample Quote Requests + Quotations + Orders + Payments ----
  // Clear transactional data to keep sample seeding idempotent.
  await db.qualityCheck.deleteMany();
  await db.productionJob.deleteMany();
  await db.orderStatusHistory.deleteMany();
  await db.orderItem.deleteMany();
  await db.payment.deleteMany();
  await db.order.deleteMany();
  await db.quotationItem.deleteMany();
  await db.quotation.deleteMany();
  await db.quoteRequestValue.deleteMany();
  await db.quoteRequest.deleteMany();
  await db.notification.deleteMany();
  await db.contactMessage.deleteMany();
  await db.auditLog.deleteMany();

  const svcBookPrint = await db.service.findUnique({ where: { slug: 'book-printing' } });
  const svcDocPrint = await db.service.findUnique({ where: { slug: 'document-printing' } });
  const svcBanner = await db.service.findUnique({ where: { slug: 'rollup-banners' } });

  // Sample 1: completed order
  if (svcBookPrint && customers[0]) {
    const qr = await db.quoteRequest.create({ data: {
      requestNumber: generateReference('REQ', 1), customerId: customers[0].id, serviceId: svcBookPrint.id,
      createdBy: customers[0].userId, subject: 'Book printing — Whispers of the Savannah',
      description: 'Reprint of 200 copies of the novel.', status: 'QUOTED', priority: 'NORMAL',
      requestedDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), estimatedBudget: 70000,
    }});
    const q = await db.quotation.create({ data: {
      quoteNumber: generateReference('QTR', 1), quoteRequestId: qr.id, customerId: customers[0].id,
      status: 'CUSTOMER_ACCEPTED', currency: 'KES', subtotal: 70000, discount: 5000, taxRate: 0, tax: 0, total: 65000,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), createdById: sales.id,
      approvedAt: new Date(), sentAt: new Date(), customerViewedAt: new Date(),
      notes: 'Includes interior printing + matte softcover, perfect bound.',
      terms: '50% deposit required to commence production. Balance on completion.',
    }});
    await db.quotationItem.create({ data: {
      quotationId: q.id, serviceId: svcBookPrint.id, description: 'Whispers of the Savannah — 200 copies, 248pp, A5, perfect bound, matte softcover',
      quantity: 200, unitPrice: 350, discount: 5000, taxRate: 0, lineTotal: 65000, sortOrder: 1,
    }});
    const order = await db.order.create({ data: {
      orderNumber: generateReference('ORD', 1), customerId: customers[0].id, quotationId: q.id,
      status: 'COMPLETED', paymentStatus: 'PAID', productionStatus: 'completed',
      currency: 'KES', subtotal: 70000, discount: 5000, tax: 0, total: 65000,
      amountPaid: 65000, amountDue: 0, depositRequired: 32500, depositAmount: 32500,
      expectedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      actualCompletionDate: new Date(),
      assignedToId: production.id, trackingToken: generateTrackingToken(),
      notes: 'Production complete. Collected by customer.',
    }});
    await db.orderItem.create({ data: {
      orderId: order.id, serviceId: svcBookPrint.id,
      description: '200 copies of Whispers of the Savannah',
      quantity: 200, unitPrice: 350, discount: 5000, taxRate: 0, lineTotal: 65000, status: 'completed',
    }});
    await db.payment.create({ data: {
      paymentReference: generateReference('PAY', 1), orderId: order.id, customerId: customers[0].id,
      method: 'MPESA', amount: 32500, currency: 'KES', status: 'SUCCESSFUL',
      transactionReference: 'MPESA-7AB12CD34', providerReference: 'SAF-001-XYZ',
      recordedById: finance.id, paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      notes: 'Deposit via M-Pesa STK Push.',
    }});
    await db.payment.create({ data: {
      paymentReference: generateReference('PAY', 2), orderId: order.id, customerId: customers[0].id,
      method: 'CASH', amount: 32500, currency: 'KES', status: 'SUCCESSFUL',
      transactionReference: 'CASH-001', providerReference: 'CASH-001',
      recordedById: finance.id, paidAt: new Date(),
      notes: 'Final balance paid on collection.',
    }});
    await db.productionJob.create({ data: {
      orderId: order.id, orderItemId: null, jobNumber: generateReference('JOB', 1),
      assignedToId: production.id, status: 'COMPLETED', priority: 'NORMAL',
      startAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completedAt: new Date(),
      instructions: 'Print interior, perfect bind, matte cover.',
    }});
  }

  // Sample 2: in production
  if (svcDocPrint && customers[2]) {
    const qr2 = await db.quoteRequest.create({ data: {
      requestNumber: generateReference('REQ', 2), customerId: customers[2].id, serviceId: svcDocPrint.id,
      createdBy: customers[2].userId, subject: 'Annual school report printing',
      description: 'Printing of 500 copies of the annual school report, 40 pages each.', status: 'QUOTED', priority: 'URGENT',
      requestedDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), estimatedBudget: 120000,
    }});
    const q2 = await db.quotation.create({ data: {
      quoteNumber: generateReference('QTR', 2), quoteRequestId: qr2.id, customerId: customers[2].id,
      status: 'CUSTOMER_ACCEPTED', currency: 'KES', subtotal: 100000, discount: 0, taxRate: 0, tax: 0, total: 100000,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), createdById: sales.id,
      approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      customerViewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: '40-page A4 reports, B&W interior, colour cover, saddle-stitched.',
      terms: '50% deposit to commence.',
    }});
    await db.quotationItem.create({ data: {
      quotationId: q2.id, serviceId: svcDocPrint.id,
      description: '500 copies x 40 pages — Annual school report',
      quantity: 500, unitPrice: 200, discount: 0, taxRate: 0, lineTotal: 100000, sortOrder: 1,
    }});
    const order2 = await db.order.create({ data: {
      orderNumber: generateReference('ORD', 2), customerId: customers[2].id, quotationId: q2.id,
      status: 'IN_PRODUCTION', paymentStatus: 'PARTIALLY_PAID', productionStatus: 'in_progress',
      currency: 'KES', subtotal: 100000, discount: 0, tax: 0, total: 100000,
      amountPaid: 50000, amountDue: 50000, depositRequired: 50000, depositAmount: 50000,
      expectedCompletionDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      assignedToId: production.id, trackingToken: generateTrackingToken(),
      notes: 'In production. Cover design approved.',
    }});
    await db.orderItem.create({ data: {
      orderId: order2.id, serviceId: svcDocPrint.id,
      description: '500 copies x 40 pages — Annual school report',
      quantity: 500, unitPrice: 200, discount: 0, taxRate: 0, lineTotal: 100000, status: 'in_progress',
    }});
    await db.payment.create({ data: {
      paymentReference: generateReference('PAY', 3), orderId: order2.id, customerId: customers[2].id,
      method: 'BANK', amount: 50000, currency: 'KES', status: 'SUCCESSFUL',
      transactionReference: 'BANK-TFR-9981', providerReference: 'BANK-9981',
      recordedById: finance.id, paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: '50% deposit via bank transfer.',
    }});
    await db.productionJob.create({ data: {
      orderId: order2.id, jobNumber: generateReference('JOB', 2),
      assignedToId: production.id, status: 'IN_PROGRESS', priority: 'URGENT',
      startAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      instructions: 'Print interior + cover, saddle-stitch.',
    }});
  }

  // Sample 3: pending quotation (quote request submitted, no quotation yet)
  if (svcBanner && customers[4]) {
    await db.quoteRequest.create({ data: {
      requestNumber: generateReference('REQ', 3), customerId: customers[4].id, serviceId: svcBanner.id,
      createdBy: customers[4].userId, subject: 'Event roll-up banners',
      description: '3 roll-up banners for a corporate launch event next week.', status: 'SUBMITTED', priority: 'URGENT',
      requestedDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), estimatedBudget: 9000,
    }});
  }

  // Sample 4: draft quote request
  if (svcDocPrint && customers[3]) {
    await db.quoteRequest.create({ data: {
      requestNumber: generateReference('REQ', 4), customerId: customers[3].id, serviceId: svcDocPrint.id,
      createdBy: customers[3].userId, subject: 'Sunday bulletin printing',
      description: 'Weekly bulletin, 8 pages, 300 copies.', status: 'UNDER_REVIEW', priority: 'NORMAL',
      requestedDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), estimatedBudget: 12000,
    }});
  }

  // ---- Notifications ----
  await db.notification.create({ data: { userId: admin.id, title: 'New quote request', message: 'Nexus Logistics requested event roll-up banners (urgent).', type: 'info', link: 'admin-quotations' }});
  await db.notification.create({ data: { userId: admin.id, title: 'Low stock alert', message: 'Cyan Toner Cartridge is below reorder level.', type: 'warning', link: 'admin-inventory' }});
  await db.notification.create({ data: { userId: admin.id, title: 'Payment received', message: 'M-Pesa deposit of KES 50,000 for ORD-000002.', type: 'success', link: 'admin-sales' }});
  await db.notification.create({ data: { userId: admin.id, title: 'Manuscript submitted', message: 'Faith Wanjiku submitted a new manuscript version.', type: 'info', link: 'admin-publishing' }});
  await db.notification.create({ data: { userId: customers[0].userId, title: 'Order completed', message: 'Your order ORD-000001 is ready for collection.', type: 'success', link: 'customer-dashboard' }});

  // ---- Audit logs ----
  await db.auditLog.createMany({ data: [
    { actorId: admin.id, action: 'system.seed', entityType: 'system', newValuesJson: JSON.stringify({ message: 'Initial database seed completed' }) },
    { actorId: sales.id, action: 'quotation.created', entityType: 'quotation', entityId: 'QTR-000001', newValuesJson: JSON.stringify({ total: 65000 }) },
    { actorId: finance.id, action: 'payment.recorded', entityType: 'payment', entityId: 'PAY-000001', newValuesJson: JSON.stringify({ amount: 32500, method: 'MPESA' }) },
    { actorId: production.id, action: 'order.status_changed', entityType: 'order', entityId: 'ORD-000002', newValuesJson: JSON.stringify({ from: 'CONFIRMED', to: 'IN_PRODUCTION' }) },
  ]});

  // ---- Contact messages ----
  await db.contactMessage.createMany({ data: [
    { name: 'Brian Otieno', email: 'brian@example.com', phone: '+254722333444', subject: 'Bulk printing inquiry', message: 'I need 2000 booklets printed. Can you share a quote?', status: 'new' },
    { name: 'Sarah Wambui', email: 'sarah@example.com', phone: '+254722555666', subject: 'Branding package', message: 'Looking for vehicle branding for our fleet of 5 vans.', status: 'assigned' },
  ]});

  console.log('✓ Seed completed.');
  console.log('  Admin login: admin@printpublish.co.ke / admin123');
  console.log('  Customer login: jane.njeri@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
