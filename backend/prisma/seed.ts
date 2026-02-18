import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PERMISSION_DEFINITIONS } from '../src/common/constants/permissions';
import { ROLE_DEFINITIONS, SYSTEM_ROLES } from '../src/common/constants/roles';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // =========================================================================
  // 1. SEED PERMISSIONS
  // =========================================================================
  console.log('📝 Seeding permissions...');

  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
    });
  }

  console.log(`✅ Seeded ${PERMISSION_DEFINITIONS.length} permissions`);

  // =========================================================================
  // 2. SEED DEMO TENANT
  // =========================================================================
  console.log('🏢 Seeding demo tenant...');

  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Demo tenant created: ${demoTenant.id}`);

  // =========================================================================
  // 3. SEED TENANT SETTINGS
  // =========================================================================
  console.log('⚙️ Seeding tenant settings...');

  await prisma.tenantSettings.upsert({
    where: { tenantId: demoTenant.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      timezone: 'America/New_York',
      currency: 'USD',
      invoicePrefix: 'INV-',
      invoiceNextNumber: 1001,
    },
  });

  // =========================================================================
  // 4. SEED ROLES FOR TENANT
  // =========================================================================
  console.log('👥 Seeding roles...');

  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

  const createdRoles: Map<string, string> = new Map();

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId: demoTenant.id,
          name: roleDef.name,
        },
      },
      update: {
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
        isDefault: roleDef.isDefault,
      },
      create: {
        tenantId: demoTenant.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
        isDefault: roleDef.isDefault,
      },
    });

    createdRoles.set(roleDef.name, role.id);

    // Clear existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Add permissions to role
    const rolePermissions = roleDef.permissions
      .map((permCode) => {
        const permId = permissionMap.get(permCode);
        if (!permId) {
          console.warn(`  ⚠️ Permission not found: ${permCode}`);
          return null;
        }
        return { roleId: role.id, permissionId: permId };
      })
      .filter((rp): rp is { roleId: string; permissionId: string } => rp !== null);

    if (rolePermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermissions,
        skipDuplicates: true,
      });
    }

    console.log(`  ✅ Role "${roleDef.name}" with ${rolePermissions.length} permissions`);
  }

  // =========================================================================
  // 5. SEED DEMO USERS
  // =========================================================================
  console.log('👤 Seeding demo users...');

  const passwordHash = await hash('Demo@123!', 12);

  // Owner user
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      email: 'owner@demo.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Owner',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: ownerUser.id },
    update: {},
    create: { userId: ownerUser.id },
  });

  const ownerEmployee = await prisma.employee.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: ownerUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: ownerUser.id,
      roleId: createdRoles.get(SYSTEM_ROLES.OWNER)!,
      employeeNumber: 'EMP001',
      department: 'Executive',
      position: 'CEO',
      isActive: true,
    },
  });

  console.log(`  ✅ Owner: owner@demo.com (Password: Demo@123!)`);

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  const adminEmployee = await prisma.employee.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: adminUser.id,
      roleId: createdRoles.get(SYSTEM_ROLES.ADMIN)!,
      employeeNumber: 'EMP002',
      department: 'Administration',
      position: 'Administrator',
      isActive: true,
    },
  });

  console.log(`  ✅ Admin: admin@demo.com (Password: Demo@123!)`);

  // Manager user
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Manager',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: { userId: managerUser.id },
  });

  const managerEmployee = await prisma.employee.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: managerUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: managerUser.id,
      roleId: createdRoles.get(SYSTEM_ROLES.MANAGER)!,
      employeeNumber: 'EMP003',
      department: 'Sales',
      position: 'Sales Manager',
      isActive: true,
    },
  });

  console.log(`  ✅ Manager: manager@demo.com (Password: Demo@123!)`);

  // Employee user
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@demo.com' },
    update: {},
    create: {
      email: 'employee@demo.com',
      passwordHash,
      firstName: 'Emily',
      lastName: 'Employee',
      status: 'ACTIVE',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: employeeUser.id },
    update: {},
    create: { userId: employeeUser.id },
  });

  const regularEmployee = await prisma.employee.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: employeeUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: employeeUser.id,
      roleId: createdRoles.get(SYSTEM_ROLES.EMPLOYEE)!,
      employeeNumber: 'EMP004',
      department: 'Sales',
      position: 'Sales Representative',
      isActive: true,
    },
  });

  console.log(`  ✅ Employee: employee@demo.com (Password: Demo@123!)`);

  // =========================================================================
  // 6. SEED LEAD SOURCES
  // =========================================================================
  console.log('📊 Seeding lead sources...');

  const leadSources = [
    { name: 'Website', description: 'Leads from company website' },
    { name: 'Referral', description: 'Referrals from existing customers' },
    { name: 'LinkedIn', description: 'LinkedIn outreach and ads' },
    { name: 'Google Ads', description: 'Google advertising campaigns' },
    { name: 'Trade Show', description: 'Trade shows and events' },
    { name: 'Cold Call', description: 'Outbound cold calling' },
    { name: 'Email Campaign', description: 'Email marketing campaigns' },
    { name: 'Partner', description: 'Partner referrals' },
  ];

  for (const source of leadSources) {
    await prisma.leadSource.upsert({
      where: {
        tenantId_name: {
          tenantId: demoTenant.id,
          name: source.name,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        name: source.name,
        description: source.description,
        isActive: true,
      },
    });
  }

  console.log(`  ✅ Seeded ${leadSources.length} lead sources`);

  // =========================================================================
  // 7. SEED TAGS
  // =========================================================================
  console.log('🏷️ Seeding tags...');

  const tags = [
    { name: 'Hot Lead', color: '#FF5733' },
    { name: 'Follow Up', color: '#33B5FF' },
    { name: 'VIP', color: '#FFD700' },
    { name: 'Enterprise', color: '#9B59B6' },
    { name: 'SMB', color: '#2ECC71' },
    { name: 'Startup', color: '#E74C3C' },
    { name: 'Priority', color: '#F39C12' },
    { name: 'Urgent', color: '#E91E63' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: {
        tenantId_name: {
          tenantId: demoTenant.id,
          name: tag.name,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        name: tag.name,
        color: tag.color,
      },
    });
  }

  console.log(`  ✅ Seeded ${tags.length} tags`);

  // =========================================================================
  // 8. SEED SAMPLE LEADS
  // =========================================================================
  console.log('👥 Seeding sample leads...');

  const websiteSource = await prisma.leadSource.findFirst({
    where: { tenantId: demoTenant.id, name: 'Website' },
  });

  const referralSource = await prisma.leadSource.findFirst({
    where: { tenantId: demoTenant.id, name: 'Referral' },
  });

  const sampleLeads = [
    {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@techcorp.com',
      phone: '+1-555-0101',
      companyName: 'TechCorp Inc',
      jobTitle: 'CTO',
      status: 'QUALIFIED' as const,
      temperature: 'HOT' as const,
      potentialValue: 50000,
      leadSourceId: websiteSource?.id,
      assignedToId: managerEmployee.id,
    },
    {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@startupxyz.com',
      phone: '+1-555-0102',
      companyName: 'Startup XYZ',
      jobTitle: 'Founder',
      status: 'NEW' as const,
      temperature: 'WARM' as const,
      potentialValue: 25000,
      leadSourceId: referralSource?.id,
      assignedToId: regularEmployee.id,
    },
    {
      firstName: 'Carol',
      lastName: 'Williams',
      email: 'carol@enterprise.com',
      phone: '+1-555-0103',
      companyName: 'Enterprise Solutions',
      jobTitle: 'VP of Operations',
      status: 'PROPOSAL' as const,
      temperature: 'HOT' as const,
      potentialValue: 150000,
      leadSourceId: websiteSource?.id,
      assignedToId: managerEmployee.id,
    },
    {
      firstName: 'David',
      lastName: 'Brown',
      email: 'david@smallbiz.com',
      phone: '+1-555-0104',
      companyName: 'Small Biz LLC',
      jobTitle: 'Owner',
      status: 'CONTACTED' as const,
      temperature: 'COLD' as const,
      potentialValue: 10000,
      leadSourceId: referralSource?.id,
      assignedToId: regularEmployee.id,
    },
    {
      firstName: 'Eva',
      lastName: 'Martinez',
      email: 'eva@globalcorp.com',
      phone: '+1-555-0105',
      companyName: 'Global Corp',
      jobTitle: 'Director of IT',
      status: 'NEGOTIATION' as const,
      temperature: 'HOT' as const,
      potentialValue: 200000,
      leadSourceId: websiteSource?.id,
      assignedToId: managerEmployee.id,
    },
  ];

  for (const leadData of sampleLeads) {
    await prisma.lead.create({
      data: {
        ...leadData,
        tenantId: demoTenant.id,
        createdById: ownerEmployee.id,
      },
    });
  }

  console.log(`  ✅ Seeded ${sampleLeads.length} sample leads`);

  // =========================================================================
  // DONE
  // =========================================================================
  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Demo Credentials:');
  console.log('   Owner:    owner@demo.com    / Demo@123!');
  console.log('   Admin:    admin@demo.com    / Demo@123!');
  console.log('   Manager:  manager@demo.com  / Demo@123!');
  console.log('   Employee: employee@demo.com / Demo@123!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });