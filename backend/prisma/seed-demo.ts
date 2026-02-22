/**
 * seed-demo.ts
 * ────────────────────────────────────────────────────────────────────
 * Realistic demo-data seed for a **roofing company** SMB tenant.
 *
 * Prerequisites: run the main `seed.ts` first (permissions, roles, users).
 *
 * Usage:
 *   npx tsx prisma/seed-demo.ts
 * ────────────────────────────────────────────────────────────────────
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Random int in [min, max] inclusive */
const rint = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/** Random element from an array */
const pick = <T>(arr: T[]): T => arr[rint(0, arr.length - 1)];

/** Random subset of n elements */
const pickN = <T>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
};

/** Date N months ago from now (Feb 2026) */
const monthsAgo = (n: number): Date => {
    const d = new Date('2026-02-22T12:00:00Z');
    d.setMonth(d.getMonth() - n);
    d.setDate(rint(1, 28));
    d.setHours(rint(8, 17), rint(0, 59));
    return d;
};

/** Date N days from a base date */
const addDays = (base: Date, days: number): Date => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
};

/** Format price as Prisma Decimal */
const dec = (n: number): Prisma.Decimal => new Prisma.Decimal(n.toFixed(2));

// ─── Ontario Cities & Data ────────────────────────────────────────────────────

const ONTARIO_CITIES = [
    'Toronto', 'Mississauga', 'Brampton', 'Hamilton', 'Ottawa',
    'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor',
    'Richmond Hill', 'Oakville', 'Burlington', 'Barrie', 'Oshawa',
    'St. Catharines', 'Cambridge', 'Kingston', 'Guelph', 'Whitby',
];

const FIRST_NAMES = [
    'James', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas',
    'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Paul', 'Andrew',
    'Joshua', 'Kenneth', 'Kevin', 'Brian', 'Mary', 'Patricia', 'Jennifer', 'Linda',
    'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy',
    'Margaret', 'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Donna', 'Emily', 'Carol',
    'Michelle', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon',
    'Laura', 'Cynthia', 'Kathleen',
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts',
];

const ROOFING_TYPES = [
    'Asphalt Shingle Replacement', 'Flat Roof Repair', 'Metal Roof Installation',
    'Cedar Shake Restoration', 'Emergency Leak Repair', 'Skylight Installation',
    'Gutter Replacement & Guards', 'Soffit & Fascia Repair', 'Roof Inspection',
    'Commercial Roof Coating', 'Slate Tile Replacement', 'TPO Membrane Install',
    'Standing Seam Metal Roof', 'Torch-On Membrane Repair', 'Chimney Flashing Repair',
    'Attic Ventilation Upgrade', 'Storm Damage Restoration', 'Snow Guard Installation',
    'Green Roof Installation', 'Solar Panel Roof Prep',
];

const TASK_TITLES_PROJECT = [
    'Order roofing materials', 'Schedule crew for tear-off', 'Pre-job safety inspection',
    'Customer walkthrough - scope review', 'Install underlayment', 'Install shingles',
    'Complete flashing work', 'Final quality inspection', 'Client sign-off walkthrough',
    'Submit warranty registration', 'Process permit application', 'Arrange dumpster delivery',
    'Photograph completed work', 'Send completion certificate', 'Follow up on punch list',
];

const TASK_TITLES_CLIENT = [
    'Send annual maintenance reminder', 'Follow up on estimate approval',
    'Collect overdue payment', 'Schedule seasonal inspection', 'Send referral thank-you',
    'Update contact information', 'Review warranty expiration', 'Send 1-year check-in email',
    'Request Google review', 'Prepare renewal quote',
];

const LEAD_SOURCES_ROOFING = [
    'Website', 'Google Ads', 'Referral', 'HomeStars', 'Facebook Ad',
    'Yard Sign', 'Door Knock', 'Partner',
];

const INVOICE_ITEMS_ROOFING = [
    { desc: 'Architectural shingles (CertainTeed Landmark)', unit: 95 },
    { desc: 'Ice & water shield membrane', unit: 45 },
    { desc: 'Synthetic underlayment roll', unit: 35 },
    { desc: 'Drip edge aluminum (10ft)', unit: 12 },
    { desc: 'Ridge vent (4ft section)', unit: 18 },
    { desc: 'Roofing nails (5lb box)', unit: 8 },
    { desc: 'Step flashing kit', unit: 25 },
    { desc: 'Pipe boot flashing', unit: 15 },
    { desc: 'Tear-off labour (per square)', unit: 75 },
    { desc: 'Installation labour (per square)', unit: 120 },
    { desc: 'Waste disposal & dumpster', unit: 350 },
    { desc: 'Permit fee', unit: 250 },
    { desc: 'Skylight flashing kit', unit: 185 },
    { desc: 'Soffit panel (vinyl, 12ft)', unit: 22 },
    { desc: 'Fascia board (aluminum, 12ft)', unit: 28 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🏗️  Starting roofing company demo seed...\n');

    // ── 0. Resolve existing tenant & employees ──────────────────────────────

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-company' } });
    if (!tenant) throw new Error('Demo tenant not found. Run `npx prisma db seed` first.');
    const T = tenant.id;


    const employees = await prisma.employee.findMany({
        where: { tenantId: T, isActive: true },
        include: { user: true },
    });
    if (employees.length < 2) throw new Error('Need at least 2 employees. Run base seed first.');
    const empIds = employees.map((e) => e.id);

    // ── 1. Lead Sources ─────────────────────────────────────────────────────

    console.log('📊 Ensuring lead sources...');
    const sourceMap = new Map<string, string>();
    for (const name of LEAD_SOURCES_ROOFING) {
        const src = await prisma.leadSource.upsert({
            where: { tenantId_name: { tenantId: T, name } },
            update: {},
            create: { tenantId: T, name, description: `Leads from ${name}`, isActive: true },
        });
        sourceMap.set(name, src.id);
    }

    // ── 2. Tags ─────────────────────────────────────────────────────────────

    console.log('🏷️  Ensuring tags...');
    const tagNames = ['Residential', 'Commercial', 'Insurance Claim', 'Urgent', 'Repeat Customer',
        'High Value', 'Warranty Work', 'Referral Bonus'];
    const tagMap = new Map<string, string>();
    const tagColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
    for (let i = 0; i < tagNames.length; i++) {
        const tag = await prisma.tag.upsert({
            where: { tenantId_name: { tenantId: T, name: tagNames[i] } },
            update: {},
            create: { tenantId: T, name: tagNames[i], color: tagColors[i] },
        });
        tagMap.set(tagNames[i], tag.id);
    }

    // ── 3. Clients (40) ────────────────────────────────────────────────────

    console.log('👥 Creating 40 clients...');
    const usedClientEmails = new Set<string>();
    const clientIds: string[] = [];

    const lifecycles: Array<'NEW_CUSTOMER' | 'ONBOARDING' | 'ACTIVE' | 'VIP' | 'AT_RISK' | 'CHURNED' | 'RE_ENGAGED'> =
        ['ACTIVE', 'ACTIVE', 'ACTIVE', 'VIP', 'VIP', 'AT_RISK', 'NEW_CUSTOMER', 'ONBOARDING', 'CHURNED', 'RE_ENGAGED'];
    const clientStatuses: Array<'ACTIVE' | 'INACTIVE' | 'CHURNED' | 'PROSPECT'> =
        ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'CHURNED'];

    for (let i = 0; i < 40; i++) {
        const first = pick(FIRST_NAMES);
        const last = pick(LAST_NAMES);
        let email: string;
        do {
            email = `${first.toLowerCase()}.${last.toLowerCase()}${rint(1, 99)}@${pick(['gmail.com', 'outlook.com', 'yahoo.ca', 'hotmail.com', 'rogers.com', 'bell.net'])}`;
        } while (usedClientEmails.has(email));
        usedClientEmails.add(email);

        const city = pick(ONTARIO_CITIES);
        const phone = `+1-${rint(416, 905)}-${rint(100, 999)}-${rint(1000, 9999)}`;
        const isBusinessClient = Math.random() > 0.65;
        const createdMonthsAgo = rint(1, 12);
        const lifecycle = pick(lifecycles);
        const status = lifecycle === 'CHURNED' ? 'CHURNED' as const
            : lifecycle === 'AT_RISK' ? 'INACTIVE' as const
                : pick(clientStatuses);
        const revenue = lifecycle === 'VIP' ? rint(25000, 120000)
            : lifecycle === 'ACTIVE' ? rint(3000, 40000)
                : lifecycle === 'CHURNED' ? rint(500, 8000)
                    : rint(0, 5000);

        const client = await prisma.client.create({
            data: {
                tenantId: T,
                clientName: isBusinessClient ? `${last} ${pick(['Contracting', 'Properties', 'Homes', 'Developments', 'Realty', 'Holdings'])}` : `${first} ${last}`,
                companyName: isBusinessClient ? `${last} ${pick(['Corp', 'Inc.', 'Ltd.', 'Group', 'LLC'])}` : undefined,
                clientType: isBusinessClient ? 'BUSINESS' : 'INDIVIDUAL',
                primaryEmail: email,
                primaryPhone: phone,
                status,
                lifecycleStage: lifecycle,
                assignedOwnerId: pick(empIds),
                streetAddress: `${rint(10, 9999)} ${pick(['Maple', 'King', 'Queen', 'Bay', 'Bloor', 'Dundas', 'Yonge', 'College', 'Elm', 'Cedar'])} ${pick(['St', 'Ave', 'Rd', 'Blvd', 'Dr', 'Ct', 'Cres'])}`,
                city,
                province: 'ON',
                postalCode: `${pick(['M', 'L', 'N', 'K'])}${rint(1, 9)}${pick(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L'])} ${rint(1, 9)}${pick(['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L'])}${rint(1, 9)}`,
                country: 'CA',
                currency: 'CAD',
                paymentTerms: pick(['Net 15', 'Net 30', 'Due on Receipt', 'Net 45']),
                totalRevenue: dec(revenue),
                leadSource: pick(LEAD_SOURCES_ROOFING),
                clientCategory: isBusinessClient ? 'Commercial' : 'Residential',
                tags: JSON.stringify(pickN(['Residential', 'Commercial', 'Insurance Claim', 'Repeat Customer', 'High Value'], rint(0, 2))),
                internalNotes: i % 5 === 0 ? `Long-standing client from ${city}. Prefers email communication.` : undefined,
                createdAt: monthsAgo(createdMonthsAgo),
                updatedAt: monthsAgo(Math.max(0, createdMonthsAgo - rint(0, 2))),
            },
        });
        clientIds.push(client.id);
    }
    console.log(`  ✅ 40 clients created`);

    // ── 4. Leads (25) ──────────────────────────────────────────────────────

    console.log('🎯 Creating 25 leads...');
    const usedLeadEmails = new Set<string>();
    const leadStatuses: Array<'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'> =
        ['NEW', 'NEW', 'CONTACTED', 'CONTACTED', 'QUALIFIED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const temperatures: Array<'COLD' | 'WARM' | 'HOT'> = ['COLD', 'WARM', 'WARM', 'HOT'];

    for (let i = 0; i < 25; i++) {
        const first = pick(FIRST_NAMES);
        const last = pick(LAST_NAMES);
        let email: string;
        do {
            email = `${first.toLowerCase()}.${last.toLowerCase()}${rint(1, 99)}@${pick(['gmail.com', 'outlook.com', 'yahoo.ca'])}`;
        } while (usedLeadEmails.has(email) || usedClientEmails.has(email));
        usedLeadEmails.add(email);

        const city = pick(ONTARIO_CITIES);
        const status = pick(leadStatuses);
        const coldWarm: Array<'COLD' | 'WARM'> = ['COLD', 'WARM'];
        const temp = status === 'NEW' ? pick(coldWarm)
            : status === 'WON' ? ('HOT' as const)
                : pick(temperatures);
        const converted = status === 'WON';
        const createdMonth = rint(1, 10);

        await prisma.lead.create({
            data: {
                tenantId: T,
                firstName: first,
                lastName: last,
                email,
                phone: `+1-${rint(416, 905)}-${rint(100, 999)}-${rint(1000, 9999)}`,
                location: `${city}, ON`,
                companyName: Math.random() > 0.5 ? `${last} ${pick(['Home', 'Property', 'Estate'])}` : undefined,
                jobTitle: pick(['Homeowner', 'Property Manager', 'Superintendent', 'Facility Manager', 'Owner', undefined]),
                status,
                temperature: temp,
                lifecycleStage: status === 'NEW' ? 'LEAD' : status === 'QUALIFIED' ? 'MQL' : status === 'PROPOSAL' ? 'SQL' : status === 'WON' ? 'OPPORTUNITY' : 'LEAD',
                potentialValue: dec(rint(2000, 45000)),
                leadSourceId: sourceMap.get(pick(LEAD_SOURCES_ROOFING)),
                assignedToId: pick(empIds),
                createdById: pick(empIds),
                notes: pick([
                    `Needs roof inspection after recent storm. ${city} area.`,
                    `Interested in full shingle replacement. Getting 3 quotes.`,
                    `Insurance claim in progress. Adjuster visit scheduled.`,
                    `Referred by a neighbour. Very interested.`,
                    `Commercial building — flat roof membrane replacement.`,
                    `Inquired via Google Ads. Budget-conscious.`,
                    undefined,
                ]),
                convertedAt: converted ? monthsAgo(createdMonth - 1) : undefined,
                convertedToClientId: converted ? pick(clientIds) : undefined,
                createdAt: monthsAgo(createdMonth),
            },
        });
    }
    console.log(`  ✅ 25 leads created`);

    // ── 5. Projects (20) ──────────────────────────────────────────────────

    console.log('📋 Creating 20 projects...');
    const projectIds: string[] = [];
    const projectClientMap: Record<string, string> = {};
    const projectStatuses: Array<'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'> =
        ['PLANNING', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'COMPLETED', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];

    for (let i = 0; i < 20; i++) {
        const clientId = pick(clientIds);
        const status = pick(projectStatuses);
        const startMonth = rint(1, 10);
        const startDate = monthsAgo(startMonth);
        const endDate = addDays(startDate, rint(7, 90));
        const budget = rint(3000, 65000);
        const progress = status === 'COMPLETED' ? 100
            : status === 'CANCELLED' ? rint(0, 30)
                : status === 'ON_HOLD' ? rint(10, 60)
                    : status === 'PLANNING' ? 0
                        : rint(10, 90);

        const project = await prisma.project.create({
            data: {
                tenantId: T,
                name: pick(ROOFING_TYPES),
                description: `Roofing project for client. ${pick(['Standard residential job.', 'Commercial building — requires crane access.', 'Insurance-covered storm damage repair.', 'Routine maintenance replacement.', 'Complete tear-off and re-roof.'])}`,
                code: `PRJ-${String(1001 + i)}`,
                status,
                startDate,
                endDate: status === 'COMPLETED' ? addDays(startDate, rint(7, 45)) : endDate,
                actualEndDate: status === 'COMPLETED' ? addDays(startDate, rint(10, 50)) : undefined,
                budget: dec(budget),
                currency: 'CAD',
                progress,
                clientId,
                createdAt: addDays(startDate, -rint(1, 7)),
            },
        });
        projectIds.push(project.id);
        projectClientMap[project.id] = clientId;

        // Add 1–2 project members
        const members = pickN(empIds, rint(1, 2));
        for (const empId of members) {
            await prisma.projectMember.create({
                data: {
                    projectId: project.id,
                    employeeId: empId,
                    role: pick(['Project Manager', 'Lead Roofer', 'Estimator', 'Site Supervisor']),
                },
            }).catch(() => { }); // skip duplicates
        }
    }
    console.log(`  ✅ 20 projects created`);

    // ── 6. Tasks (60) ─────────────────────────────────────────────────────

    console.log('✅ Creating 60 tasks...');
    const taskStatuses: Array<'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'> =
        ['TODO', 'TODO', 'IN_PROGRESS', 'IN_PROGRESS', 'REVIEW', 'DONE', 'DONE', 'DONE'];
    const taskPriorities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> =
        ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT'];

    for (let i = 0; i < 60; i++) {
        const isProjectTask = i < 40; // 40 project tasks, 20 client tasks
        const status = pick(taskStatuses);
        const dueMonth = rint(0, 3);
        const dueDate = dueMonth === 0 ? addDays(new Date(), rint(1, 30)) : monthsAgo(dueMonth);

        await prisma.task.create({
            data: {
                tenantId: T,
                title: isProjectTask ? pick(TASK_TITLES_PROJECT) : pick(TASK_TITLES_CLIENT),
                description: isProjectTask
                    ? `Task for roofing project. ${pick(['Ensure materials arrive on time.', 'Coordinate with client on schedule.', 'Safety check required before starting.', 'Weather permitting — may need to reschedule.'])}`
                    : `Client follow-up task. ${pick(['Check in on satisfaction.', 'Request referral.', 'Send maintenance reminder.', 'Collect outstanding balance.'])}`,
                status,
                priority: pick(taskPriorities),
                dueDate,
                startDate: addDays(dueDate, -rint(1, 14)),
                completedAt: status === 'DONE' ? addDays(dueDate, -rint(0, 3)) : undefined,
                estimatedTime: pick([30, 60, 120, 240, 480]),
                actualTime: status === 'DONE' ? pick([20, 45, 90, 180, 360]) : undefined,
                assignedToId: pick(empIds),
                createdById: pick(empIds),
                projectId: isProjectTask ? pick(projectIds) : undefined,
                clientId: !isProjectTask ? pick(clientIds) : undefined,
            },
        });
    }
    console.log(`  ✅ 60 tasks created`);

    // ── 7. Invoices (35) + Items ──────────────────────────────────────────

    console.log('💰 Creating 35 invoices with line items...');
    const invoiceIds: Array<{ id: string; clientId: string; total: number; status: string }> = [];
    const invoiceStatuses: Array<'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'CANCELLED'> =
        ['DRAFT', 'SENT', 'SENT', 'PAID', 'PAID', 'PAID', 'OVERDUE', 'OVERDUE', 'PARTIALLY_PAID', 'CANCELLED'];

    for (let i = 0; i < 35; i++) {
        const status = pick(invoiceStatuses);
        const clientId = pick(clientIds);
        const issueMonth = rint(1, 10);
        const issueDate = monthsAgo(issueMonth);
        const dueDate = addDays(issueDate, pick([15, 30, 45]));

        // Generate 2–5 line items
        const numItems = rint(2, 5);
        const items = pickN(INVOICE_ITEMS_ROOFING, numItems).map((item, idx) => {
            const qty = item.unit < 50 ? rint(2, 30) : rint(1, 5);
            return {
                description: item.desc,
                quantity: dec(qty),
                unitPrice: dec(item.unit),
                amount: dec(qty * item.unit),
                sortOrder: idx,
            };
        });

        const subtotal = items.reduce((s, it) => s + Number(it.amount), 0);
        const taxRate = 13; // Ontario HST
        const taxAmount = subtotal * taxRate / 100;
        const total = subtotal + taxAmount;
        const amountPaid = status === 'PAID' ? total
            : status === 'PARTIALLY_PAID' ? Math.round(total * pick([0.3, 0.5, 0.7]))
                : 0;

        const invoice = await prisma.invoice.create({
            data: {
                tenantId: T,
                invoiceNumber: `INV-${String(2001 + i)}`,
                status,
                clientId,
                issueDate,
                dueDate,
                paidAt: status === 'PAID' ? addDays(issueDate, rint(5, 30)) : undefined,
                currency: 'CAD',
                subtotal: dec(subtotal),
                taxRate: dec(taxRate),
                taxAmount: dec(taxAmount),
                discountAmount: dec(0),
                total: dec(total),
                amountPaid: dec(amountPaid),
                amountDue: dec(total - amountPaid),
                notes: pick([
                    'Thank you for choosing Zodo Roofing. Quality guaranteed.',
                    'Payment due upon completion. HST included.',
                    'Warranty: 25 years on materials, 10 years on labour.',
                    undefined,
                ]),
                terms: 'Net 30. Late payments subject to 1.5% monthly interest.',
                createdById: pick(empIds),
                sentAt: ['SENT', 'PAID', 'OVERDUE', 'PARTIALLY_PAID'].includes(status)
                    ? addDays(issueDate, rint(0, 2)) : undefined,
                createdAt: issueDate,
                items: { create: items },
            },
        });
        invoiceIds.push({ id: invoice.id, clientId, total, status });
    }
    console.log(`  ✅ 35 invoices created`);

    // ── 8. Payments (25) ──────────────────────────────────────────────────

    console.log('💳 Creating 25 payments...');
    const payablInvoices = invoiceIds.filter((inv) => ['PAID', 'PARTIALLY_PAID', 'SENT'].includes(inv.status));
    const paymentMethods: Array<'E_TRANSFER' | 'CREDIT_CARD' | 'CHECK' | 'BANK_TRANSFER' | 'CASH'> =
        ['E_TRANSFER', 'E_TRANSFER', 'CREDIT_CARD', 'CHECK', 'BANK_TRANSFER', 'CASH'];

    for (let i = 0; i < 25; i++) {
        const inv = pick(payablInvoices.length > 0 ? payablInvoices : invoiceIds);
        const paidPercent = inv.status === 'PAID' ? 1 : pick([0.25, 0.5, 0.75, 1]);
        const amount = Math.round(inv.total * paidPercent * 100) / 100;
        const paymentDate = monthsAgo(rint(0, 8));

        await prisma.invoicePayment.create({
            data: {
                tenantId: T,
                invoiceId: inv.id,
                clientId: inv.clientId,
                amount: dec(amount),
                paymentMethod: pick(paymentMethods),
                paymentDate,
                reference: `REF-${rint(100000, 999999)}`,
                notes: pick(['E-Transfer received', 'Cheque deposited', 'Credit card payment', 'Cash on site', undefined]),
                createdAt: paymentDate,
            },
        });
    }
    console.log(`  ✅ 25 payments created`);

    // ── 9. Bookings / Appointments (15) ───────────────────────────────────

    console.log('📅 Creating 15 bookings...');
    const bookingStatuses: Array<'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'> =
        ['PENDING', 'CONFIRMED', 'CONFIRMED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    const bookingTitles = [
        'Roof Inspection', 'Free Estimate Consultation', 'Storm Damage Assessment',
        'Insurance Adjuster Meeting', 'Material Selection Appointment', 'Project Kick-off Meeting',
        'Mid-Project Check-in', 'Final Walkthrough', 'Warranty Inspection',
        'Emergency Leak Assessment', 'Gutter Consultation', 'Attic Ventilation Review',
        'Post-Install Follow-up', 'Re-Roofing Consultation', 'Flat Roof Assessment',
    ];

    for (let i = 0; i < 15; i++) {
        const status = pick(bookingStatuses);
        const daysOffset = status === 'COMPLETED' ? -rint(5, 120) : status === 'PENDING' ? rint(1, 30) : rint(-30, 30);
        const startTime = addDays(new Date('2026-02-22T10:00:00Z'), daysOffset);
        startTime.setHours(pick([8, 9, 10, 11, 13, 14, 15, 16]));
        const endTime = new Date(startTime.getTime() + pick([30, 60, 90]) * 60000);

        await prisma.booking.create({
            data: {
                tenantId: T,
                title: bookingTitles[i],
                description: `${bookingTitles[i]} — ${pick(['On-site visit required.', 'Client will be present.', 'Access code needed for building.', 'Meet at front entrance.'])}`,
                status,
                startTime,
                endTime,
                timezone: 'America/Toronto',
                clientId: pick(clientIds),
                assignedToId: pick(empIds),
                location: `${rint(10, 9999)} ${pick(['Maple', 'King', 'Queen', 'Bay', 'Dundas', 'Yonge'])} ${pick(['St', 'Ave', 'Rd', 'Blvd'])}, ${pick(ONTARIO_CITIES)}, ON`,
                isOnline: false,
                notes: pick([
                    'Bring ladder and inspection camera.',
                    'Client has a dog — ring doorbell and wait.',
                    'Park in driveway. Do not block garage.',
                    'Ask about gutter add-on.',
                    undefined,
                ]),
                confirmedAt: status === 'CONFIRMED' || status === 'COMPLETED' ? addDays(startTime, -rint(1, 5)) : undefined,
                cancelledAt: status === 'CANCELLED' ? addDays(startTime, -rint(1, 3)) : undefined,
                createdAt: addDays(startTime, -rint(3, 14)),
            },
        });
    }
    console.log(`  ✅ 15 bookings created`);

    // ── 10. Files / Documents (20) ────────────────────────────────────────

    console.log('📁 Creating 20 file records...');

    // Create a root folder
    const rootFolder = await prisma.folder.create({
        data: {
            tenantId: T,
            name: 'Roofing Projects',
        },
    });

    const subFolders = ['Roof Photos', 'Contracts', 'Inspection Reports', 'Invoices', 'Permits'];
    const folderIds: string[] = [];
    for (const name of subFolders) {
        const folder = await prisma.folder.create({
            data: { tenantId: T, name, parentId: rootFolder.id },
        });
        folderIds.push(folder.id);
    }

    const fileTemplates = [
        { name: 'roof-before-front.jpg', mime: 'image/jpeg', ext: 'jpg', size: 2400000, folder: 0 },
        { name: 'roof-before-back.jpg', mime: 'image/jpeg', ext: 'jpg', size: 1800000, folder: 0 },
        { name: 'roof-after-front.jpg', mime: 'image/jpeg', ext: 'jpg', size: 3200000, folder: 0 },
        { name: 'roof-after-back.jpg', mime: 'image/jpeg', ext: 'jpg', size: 2900000, folder: 0 },
        { name: 'storm-damage-closeup.jpg', mime: 'image/jpeg', ext: 'jpg', size: 4100000, folder: 0 },
        { name: 'contract-signed.pdf', mime: 'application/pdf', ext: 'pdf', size: 156000, folder: 1 },
        { name: 'scope-of-work.pdf', mime: 'application/pdf', ext: 'pdf', size: 89000, folder: 1 },
        { name: 'warranty-certificate.pdf', mime: 'application/pdf', ext: 'pdf', size: 45000, folder: 1 },
        { name: 'inspection-report-Q4.pdf', mime: 'application/pdf', ext: 'pdf', size: 234000, folder: 2 },
        { name: 'moisture-test-results.pdf', mime: 'application/pdf', ext: 'pdf', size: 178000, folder: 2 },
        { name: 'thermal-imaging-scan.jpg', mime: 'image/jpeg', ext: 'jpg', size: 5600000, folder: 2 },
        { name: 'invoice-INV-2001.pdf', mime: 'application/pdf', ext: 'pdf', size: 67000, folder: 3 },
        { name: 'invoice-INV-2005.pdf', mime: 'application/pdf', ext: 'pdf', size: 72000, folder: 3 },
        { name: 'invoice-INV-2012.pdf', mime: 'application/pdf', ext: 'pdf', size: 68000, folder: 3 },
        { name: 'building-permit-2025.pdf', mime: 'application/pdf', ext: 'pdf', size: 190000, folder: 4 },
        { name: 'city-approval-letter.pdf', mime: 'application/pdf', ext: 'pdf', size: 45000, folder: 4 },
        { name: 'drone-overview.mp4', mime: 'video/mp4', ext: 'mp4', size: 45000000, folder: 0 },
        { name: 'material-quote-supplier.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx', size: 34000, folder: 1 },
        { name: 'crew-schedule-feb.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx', size: 28000, folder: 1 },
        { name: 'site-safety-checklist.pdf', mime: 'application/pdf', ext: 'pdf', size: 56000, folder: 2 },
    ];

    for (const f of fileTemplates) {
        const clientId = pick(clientIds);
        const projectId = pick(projectIds);
        await prisma.file.create({
            data: {
                tenantId: T,
                name: f.name,
                originalName: f.name,
                mimeType: f.mime,
                size: BigInt(f.size),
                path: `/uploads/${T}/${f.name}`,
                extension: f.ext,
                folderId: folderIds[f.folder],
                clientId,
                projectId,
                createdAt: monthsAgo(rint(0, 6)),
            },
        });
    }
    console.log(`  ✅ 20 file records created`);

    // ── Done ────────────────────────────────────────────────────────────────

    console.log('\n🎉 Roofing company demo data seeded successfully!');
    console.log('   📊 40 clients · 25 leads · 20 projects · 60 tasks');
    console.log('   💰 35 invoices · 25 payments · 15 bookings · 20 files\n');
}

main()
    .catch((e) => {
        console.error('❌ Demo seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
