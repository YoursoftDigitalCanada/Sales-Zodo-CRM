#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config();
} catch {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const useAi = args.has('--ai') && Boolean(process.env.OPENAI_API_KEY);
const tenantArg = process.argv.find((arg) => arg.startsWith('--tenant-id='));
const tenantId = tenantArg ? tenantArg.split('=').slice(1).join('=').trim() : '';

const normalizeWebsite = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutProtocol = raw
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[),.;]+$/g, '')
    .trim();
  return withoutProtocol && withoutProtocol.includes('.') ? withoutProtocol.slice(0, 255) : '';
};

const websiteFromEmail = (email) => {
  const domain = String(email || '').split('@')[1] || '';
  if (!domain || /^(gmail|yahoo|outlook|hotmail|icloud|aol|protonmail)\./i.test(domain)) return '';
  return normalizeWebsite(domain);
};

const inferIndustryFromText = (...values) => {
  const text = values.map((value) => String(value || '')).join(' ').toLowerCase();
  if (!text.trim()) return '';
  const rules = [
    [/\b(software|saas|cloud|automation|app|platform|it services?|technology|tech|digital|api|hosting|cyber)\b/, 'Technology'],
    [/\b(marketing|advertising|media|creative|seo|branding|agency|campaign)\b/, 'Advertising'],
    [/\b(accounting|bookkeeping|finance|financial|insurance|wealth|bank|tax)\b/, 'Financial Services'],
    [/\b(health|medical|clinic|dental|pharma|wellness|therapy)\b/, 'Healthcare'],
    [/\b(manufacturing|factory|industrial|machining|fabrication|production|assembly)\b/, 'Manufacturing'],
    [/\b(retail|store|shop|ecommerce|commerce|wholesale|consumer|pos)\b/, 'Retail'],
    [/\b(consulting|consultant|advisory|professional services|strategy)\b/, 'Consulting'],
    [/\b(construction|builder|contractor|renovation|installation|trades?|electrical|plumbing|hvac)\b/, 'Construction'],
    [/\b(telecom|telecommunication|wireless|internet provider|isp)\b/, 'Telecommunications'],
    [/\b(real estate|property management|brokerage|realtor|leasing)\b/, 'Real Estate'],
    [/\b(logistics|transport|shipping|freight|delivery|warehouse)\b/, 'Logistics'],
    [/\b(restaurant|cafe|food|hospitality|hotel|catering)\b/, 'Hospitality'],
    [/\b(education|school|training|course|academy|learning)\b/, 'Education'],
  ];
  return (rules.find(([pattern]) => pattern.test(text)) || [null, 'Other'])[1];
};

const territoryFromClient = (client) => {
  const country = String(client.country || '').trim();
  const province = String(client.province || '').trim();
  if (/canada|ca\b/i.test(country)) return province ? `${province}, Canada` : 'Canada';
  if (/united states|usa|us\b/i.test(country)) return province ? `${province}, United States` : 'United States';
  return country || province || '';
};

const employeeGuessFromRevenue = (annualRevenue) => {
  const value = Number(annualRevenue || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 10000) return '1-10';
  if (value < 50000) return '11-50';
  if (value < 250000) return '51-200';
  return '201-500';
};

const aiProfileForClient = async (client, invoices, deterministic) => {
  if (!useAi) return {};
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const invoiceSummary = invoices.slice(0, 8).map((invoice) => ({
      invoiceNumber: invoice.invoiceNumber,
      total: String(invoice.total),
      notes: invoice.notes,
      terms: invoice.terms,
      items: invoice.items.map((item) => item.description).filter(Boolean).slice(0, 8),
    }));
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Infer missing organization profile fields for a generic Sales CRM.',
                'Return JSON only with keys: website, industry, noOfEmployees, territory.',
                'Use only strong clues from company name, email domain, address, invoice notes, and line items.',
                'Do not invent a website unless a domain is directly available.',
                'Use broad employee ranges such as 1-10, 11-50, 51-200, 201-500.',
                JSON.stringify({
                  client: {
                    clientName: client.clientName,
                    companyName: client.companyName,
                    primaryEmail: client.primaryEmail,
                    city: client.city,
                    province: client.province,
                    country: client.country,
                  },
                  deterministic,
                  invoices: invoiceSummary,
                }),
              ].join('\n'),
            },
          ],
        },
      ],
    });
    const jsonText = String(response.output_text || '')
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(jsonText);
    return {
      website: normalizeWebsite(parsed.website),
      industry: String(parsed.industry || '').trim().slice(0, 100),
      noOfEmployees: String(parsed.noOfEmployees || '').trim().slice(0, 50),
      territory: String(parsed.territory || '').trim().slice(0, 100),
    };
  } catch (error) {
    console.warn(`[backfill] AI profile skipped for client ${client.id}: ${error.message}`);
    return {};
  }
};

const buildProfile = async (client, invoices) => {
  const invoiceText = invoices.map((invoice) => [
    invoice.notes,
    invoice.terms,
    invoice.items.map((item) => item.description).join(' '),
  ].filter(Boolean).join(' ')).join(' ');
  const annualRevenue = invoices
    .filter((invoice) => invoice.status !== 'CANCELLED')
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const deterministic = {
    website: normalizeWebsite(client.website) || websiteFromEmail(client.primaryEmail),
    industry: client.industry || inferIndustryFromText(client.clientName, client.companyName, deterministicWebsite(client), invoiceText),
    noOfEmployees: client.noOfEmployees || employeeGuessFromRevenue(annualRevenue),
    territory: client.territory || territoryFromClient(client),
    annualRevenue: new Prisma.Decimal(annualRevenue.toFixed(2)),
  };
  const ai = await aiProfileForClient(client, invoices, deterministic);
  return {
    website: client.website || ai.website || deterministic.website || '',
    industry: client.industry || ai.industry || deterministic.industry || '',
    noOfEmployees: client.noOfEmployees || ai.noOfEmployees || deterministic.noOfEmployees || '',
    territory: client.territory || ai.territory || deterministic.territory || '',
    annualRevenue: deterministic.annualRevenue,
  };
};

const deterministicWebsite = (client) => normalizeWebsite(client.website) || websiteFromEmail(client.primaryEmail);

const main = async () => {
  const clients = await prisma.client.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      invoices: { some: {} },
    },
    select: {
      id: true,
      tenantId: true,
      clientName: true,
      companyName: true,
      primaryEmail: true,
      website: true,
      industry: true,
      noOfEmployees: true,
      annualRevenue: true,
      territory: true,
      city: true,
      province: true,
      country: true,
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          notes: true,
          terms: true,
          items: {
            select: {
              description: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  let revenueUpdated = 0;
  const previews = [];

  for (const client of clients) {
    const profile = await buildProfile(client, client.invoices);
    const data = {};
    if (!client.website && profile.website) data.website = profile.website;
    if (!client.industry && profile.industry) data.industry = profile.industry;
    if (!client.noOfEmployees && profile.noOfEmployees) data.noOfEmployees = profile.noOfEmployees;
    if (!client.territory && profile.territory) data.territory = profile.territory;

    const currentRevenue = Number(client.annualRevenue || 0);
    const nextRevenue = Number(profile.annualRevenue || 0);
    if (currentRevenue !== nextRevenue) {
      data.annualRevenue = profile.annualRevenue;
      revenueUpdated += 1;
    }

    if (Object.keys(data).length) {
      previews.push({
        clientId: client.id,
        tenantId: client.tenantId,
        name: client.companyName || client.clientName,
        data,
      });
      if (apply) {
        await prisma.client.update({
          where: { id: client.id },
          data,
        });
      }
      updated += 1;
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    ai: useAi,
    tenantId: tenantId || 'all',
    clientsScanned: clients.length,
    clientsWithChanges: updated,
    clientsRevenueChanged: revenueUpdated,
    sampleChanges: previews.slice(0, 20),
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
