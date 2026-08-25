import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as mssql from 'mssql';
import { buildDataSourceOptions } from '../data-source';
import { StoredProcedureRunner } from '../../common/database/stored-procedure-runner.service';

const TENANT_SLUG = 'acme-demo';
const DEMO_USER_EMAIL = 'manager@acme-demo.com';
const DEMO_USER_PASSWORD = 'DemoPass123!';

const CUSTOMERS = [
  {
    name: 'Blue Sky Retail',
    email: 'orders@blueskyretail.com',
    phone: '+44 20 7946 0958',
    billingAddress: {
      line1: '221B Baker Street',
      city: 'London',
      postalCode: 'NW1 6XE',
      country: 'GB',
    },
  },
  {
    name: 'Northwind Traders',
    email: 'purchasing@northwindtraders.com',
    phone: '+1 206 555 0182',
    billingAddress: {
      line1: '107 5th Ave',
      city: 'Seattle',
      postalCode: '98104',
      country: 'US',
    },
  },
  {
    name: 'Cedar & Co.',
    email: 'hello@cedarandco.com',
    phone: '+1 416 555 0143',
    billingAddress: {
      line1: '88 Queen St W',
      city: 'Toronto',
      postalCode: 'M5H 2N2',
      country: 'CA',
    },
  },
  {
    name: 'Harborlight Supplies',
    email: 'accounts@harborlightsupplies.com',
    phone: '+61 2 5550 1987',
    billingAddress: {
      line1: '14 Wharf Rd',
      city: 'Sydney',
      postalCode: '2000',
      country: 'AU',
    },
  },
  {
    name: 'Maple Leaf Goods',
    email: 'orders@mapleleafgoods.ca',
    phone: '+1 514 555 0129',
    billingAddress: {
      line1: '500 Rue Saint-Jacques',
      city: 'Montreal',
      postalCode: 'H2Y 1S1',
      country: 'CA',
    },
  },
  {
    name: 'Riverside Mercantile',
    email: 'contact@riversidemercantile.com',
    phone: '+1 312 555 0176',
    billingAddress: {
      line1: '900 N Michigan Ave',
      city: 'Chicago',
      postalCode: '60611',
      country: 'US',
    },
  },
];

const PRODUCTS: {
  sku: string;
  name: string;
  unitPrice: number;
  initialStock: number;
  reorderLevel: number;
}[] = [
  {
    sku: 'MUG-BLK-11OZ',
    name: 'Black Ceramic Mug, 11oz',
    unitPrice: 12.99,
    initialStock: 480,
    reorderLevel: 100,
  },
  {
    sku: 'MUG-WHT-11OZ',
    name: 'White Ceramic Mug, 11oz',
    unitPrice: 11.99,
    initialStock: 24,
    reorderLevel: 100,
  },
  {
    sku: 'TSHIRT-BLK-M',
    name: 'Classic T-Shirt, Black, M',
    unitPrice: 18.5,
    initialStock: 220,
    reorderLevel: 50,
  },
  {
    sku: 'TSHIRT-BLK-L',
    name: 'Classic T-Shirt, Black, L',
    unitPrice: 18.5,
    initialStock: 15,
    reorderLevel: 50,
  },
  {
    sku: 'TSHIRT-WHT-M',
    name: 'Classic T-Shirt, White, M',
    unitPrice: 18.5,
    initialStock: 190,
    reorderLevel: 50,
  },
  {
    sku: 'TOTE-CANVAS',
    name: 'Canvas Tote Bag',
    unitPrice: 9.75,
    initialStock: 340,
    reorderLevel: 75,
  },
  {
    sku: 'NOTEBOOK-A5',
    name: 'A5 Hardcover Notebook',
    unitPrice: 7.25,
    initialStock: 500,
    reorderLevel: 100,
  },
  {
    sku: 'PEN-GEL-BLK',
    name: 'Gel Pen, Black (Pack of 3)',
    unitPrice: 4.5,
    initialStock: 8,
    reorderLevel: 50,
  },
  {
    sku: 'STICKER-PACK',
    name: 'Logo Sticker Pack',
    unitPrice: 3.0,
    initialStock: 610,
    reorderLevel: 150,
  },
  {
    sku: 'CAP-EMBROIDERED',
    name: 'Embroidered Baseball Cap',
    unitPrice: 16.0,
    initialStock: 95,
    reorderLevel: 40,
  },
];

async function main() {
  const dataSource = new DataSource(
    buildDataSourceOptions({
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT ?? '1433', 10),
      username: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!,
      database: process.env.DB_NAME!,
      trustServerCertificate:
        process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    }),
  );
  await dataSource.initialize();
  const runner = new StoredProcedureRunner(dataSource);

  let [tenant] = await dataSource.query<{ Id: string }[]>(
    `SELECT Id FROM Tenants WHERE Slug = @0`,
    [TENANT_SLUG],
  );

  if (!tenant) {
    [tenant] = await dataSource.query<{ Id: string }[]>(
      `INSERT INTO Tenants (Name, Slug) OUTPUT INSERTED.Id VALUES (@0, @1)`,
      ['Acme Demo', TENANT_SLUG],
    );
    const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    await dataSource.query(
      `INSERT INTO Users (TenantId, FullName, Email, PasswordHash, Role) VALUES (@0, @1, @2, @3, @4)`,
      [
        tenant.Id,
        'Demo Manager',
        DEMO_USER_EMAIL,
        passwordHash,
        'TENANT_ADMIN',
      ],
    );
    console.log(
      `Created tenant "${TENANT_SLUG}" and demo user ${DEMO_USER_EMAIL}`,
    );
  }

  const tenantId = tenant.Id;

  const [{ count: existingCustomers }] = await dataSource.query<
    { count: number }[]
  >(`SELECT COUNT(*) AS count FROM Customers WHERE TenantId = @0`, [tenantId]);
  if (existingCustomers > 0) {
    console.log('Demo catalog already seeded for this tenant — skipping.');
    await dataSource.destroy();
    return;
  }

  const customerIds: string[] = [];
  for (const customer of CUSTOMERS) {
    const [row] = await runner.execute<{ Id: string }>('usp_Customers_Create', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Name', value: customer.name },
      { name: 'Email', value: customer.email },
      { name: 'Phone', value: customer.phone },
      {
        name: 'BillingAddress',
        value: JSON.stringify(customer.billingAddress),
      },
      { name: 'ShippingAddress', value: null },
    ]);
    customerIds.push(row.Id);
  }
  console.log(`Seeded ${CUSTOMERS.length} customers.`);

  const productIds: string[] = [];
  for (const product of PRODUCTS) {
    const [row] = await runner.execute<{ Id: string }>('usp_Products_Create', [
      { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
      { name: 'Sku', value: product.sku },
      { name: 'Name', value: product.name },
      {
        name: 'UnitPrice',
        value: product.unitPrice,
        type: 'decimal',
        typeParams: [12, 2],
      },
      { name: 'Currency', value: 'USD' },
      { name: 'InitialStock', value: product.initialStock },
      { name: 'ReorderLevel', value: product.reorderLevel },
    ]);
    productIds.push(row.Id);
  }
  console.log(`Seeded ${PRODUCTS.length} products (with inventory).`);

  const [demoUser] = await dataSource.query<{ Id: string }[]>(
    `SELECT Id FROM Users WHERE TenantId = @0 AND Email = @1`,
    [tenantId, DEMO_USER_EMAIL],
  );

  const DEMO_ORDERS: {
    customerIndex: number;
    lines: { productIndex: number; quantity: number }[];
    hold?: boolean;
  }[] = [
    {
      customerIndex: 0,
      lines: [
        { productIndex: 0, quantity: 2 },
        { productIndex: 5, quantity: 3 },
      ],
    },
    { customerIndex: 1, lines: [{ productIndex: 2, quantity: 1 }] },
    {
      customerIndex: 2,
      lines: [
        { productIndex: 9, quantity: 1 },
        { productIndex: 8, quantity: 4 },
      ],
      hold: true,
    },
  ];

  for (const order of DEMO_ORDERS) {
    const linesTable = new mssql.Table('dbo.OrderLineInput');
    linesTable.columns.add('ProductId', mssql.UniqueIdentifier);
    linesTable.columns.add('Quantity', mssql.Int);
    for (const line of order.lines) {
      linesTable.rows.add(productIds[line.productIndex], line.quantity);
    }

    const [created] = await runner.execute<{ Id: string; Version: number }>(
      'usp_Orders_Create',
      [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ActorUserId', value: demoUser.Id, type: 'uniqueidentifier' },
        {
          name: 'CustomerId',
          value: customerIds[order.customerIndex],
          type: 'uniqueidentifier',
        },
        { name: 'Lines', value: linesTable },
      ],
    );

    if (order.hold) {
      await runner.execute('usp_Orders_UpdateStatus', [
        { name: 'TenantId', value: tenantId, type: 'uniqueidentifier' },
        { name: 'ActorUserId', value: demoUser.Id, type: 'uniqueidentifier' },
        { name: 'OrderId', value: created.Id, type: 'uniqueidentifier' },
        { name: 'ExpectedVersion', value: created.Version },
        { name: 'ToStatus', value: 'ON_HOLD' },
        {
          name: 'Note',
          value: 'Awaiting customer confirmation on substitute item',
        },
      ]);
    }
  }
  console.log(`Seeded ${DEMO_ORDERS.length} orders.`);

  await dataSource.destroy();
  console.log('Demo catalog seed complete.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
