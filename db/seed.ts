import bcrypt from 'bcryptjs';
import pool, { withTransaction } from './pool';

async function seedDatabase() {
  console.log('----------------------------------------------------');
  console.log('   Studio GFX Photography — Development Seed Script');
  console.log('----------------------------------------------------');

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true' && !process.argv.includes('--force')) {
    console.error('SAFETY WARNING: Development seed script is blocked in production mode.');
    console.error('To run seeding anyway, run: ALLOW_SEED=true npm run db:seed  or  npm run db:seed -- --force');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await withTransaction(async (txClient) => {
      // 1. Seed Studio Admin Account
      const adminPasswordHash = await bcrypt.hash('Admin@StudioGFX2026', 10);
      const adminEmail = 'admin@studiogfx.com';

      const adminUserResult = await txClient.query(
        `
        INSERT INTO users (email, password_hash, role, is_active)
        VALUES ($1, $2, 'admin', true)
        ON CONFLICT (email) DO UPDATE SET is_active = true
        RETURNING id;
        `,
        [adminEmail, adminPasswordHash]
      );
      const adminUserId = adminUserResult.rows[0].id;
      console.log(`[Seed] Admin user verified: ${adminEmail} (ID: ${adminUserId})`);

      // 2. Seed Staff Accounts & Profiles
      const staffMembers = [
        {
          code: 'GFX-001',
          name: 'Vikram Sharma',
          email: 'vikram.sharma@studiogfx.com',
          phone: '+91 98111 22233',
          designation: 'Team Leader',
          joiningDate: '2024-01-15',
          notes: 'Senior lead photographer and cinematography supervisor.',
        },
        {
          code: 'GFX-002',
          name: 'Arjun Mehta',
          email: 'arjun.mehta@studiogfx.com',
          phone: '+91 98222 33344',
          designation: 'Photographer / Editor',
          joiningDate: '2024-03-01',
          notes: 'Expert in candid wedding photography and Lightroom grading.',
        },
        {
          code: 'GFX-003',
          name: 'Rohit Verma',
          email: 'rohit.verma@studiogfx.com',
          phone: '+91 98333 44455',
          designation: 'Videographer',
          joiningDate: '2024-06-10',
          notes: 'Cinematic gimbal operator and drone specialist.',
        },
        {
          code: 'GFX-004',
          name: 'Neha Kapoor',
          email: 'neha.kapoor@studiogfx.com',
          phone: '+91 98444 55566',
          designation: 'Photo Editor',
          joiningDate: '2024-08-01',
          notes: 'Album design layout and fine retouching artist.',
        },
        {
          code: 'GFX-005',
          name: 'Amit Patel',
          email: 'amit.patel@studiogfx.com',
          phone: '+91 98555 66677',
          designation: 'Video Editor',
          joiningDate: '2024-09-15',
          notes: 'Premiere Pro and DaVinci Resolve color grading specialist.',
        },
      ];

      const staffPasswordHash = await bcrypt.hash('Staff@StudioGFX2026', 10);
      const createdStaffIds: { [code: string]: string } = {};

      for (const s of staffMembers) {
        // Create user login account for staff
        const userRes = await txClient.query(
          `
          INSERT INTO users (email, password_hash, role, is_active)
          VALUES ($1, $2, 'staff', true)
          ON CONFLICT (email) DO UPDATE SET is_active = true
          RETURNING id;
          `,
          [s.email, staffPasswordHash]
        );
        const staffUserId = userRes.rows[0].id;

        // Create or update staff profile
        const staffRes = await txClient.query(
          `
          INSERT INTO staff (user_id, staff_code, full_name, phone, email, designation, joining_date, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (staff_code) DO UPDATE 
            SET full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone,
                designation = EXCLUDED.designation
          RETURNING id;
          `,
          [staffUserId, s.code, s.name, s.phone, s.email, s.designation, s.joiningDate, s.notes]
        );
        createdStaffIds[s.code] = staffRes.rows[0].id;
        console.log(`[Seed] Staff member ready: ${s.name} (${s.code})`);
      }

      // 3. Seed Sample Projects
      const sampleProjects = [
        {
          code: 'PRJ-2026-001',
          name: 'Raj & Simran Grand Royal Wedding',
          client: 'Mr. Raj Malhotra',
          contact: '+91 98765 00001',
          eventType: 'Wedding Shoot',
          eventDate: '2026-10-20',
          location: 'The Leela Palace, Udaipur',
          isOutOfStation: true,
          deadline: '2026-11-20',
          status: 'Photo Editing',
          remarks: '3-day destination royal wedding with drone coverage.',
        },
        {
          code: 'PRJ-2026-002',
          name: 'Aman & Priya Scenic Pre-Wedding',
          client: 'Dr. Aman Verma',
          contact: '+91 98765 00002',
          eventType: 'Pre-Wedding Shoot',
          eventDate: '2026-10-24',
          location: 'Rishikesh Riverfront',
          isOutOfStation: true,
          deadline: '2026-11-10',
          status: 'Video Editing',
          remarks: 'Sunset and riverside drone & portrait shoot.',
        },
        {
          code: 'PRJ-2026-003',
          name: 'Karan & Natasha Engagement Gala',
          client: 'Mrs. Natasha Kapoor',
          contact: '+91 98765 00003',
          eventType: 'Engagement Shoot',
          eventDate: '2026-10-27',
          location: 'Taj Vivanta, City Center',
          isOutOfStation: false,
          deadline: '2026-11-05',
          status: 'Shooting',
          remarks: 'Evening banquet hall with 300 guests.',
        },
      ];

      const createdProjectIds: { [code: string]: string } = {};

      for (const p of sampleProjects) {
        const projRes = await txClient.query(
          `
          INSERT INTO projects (
            project_code, project_name, client_name, client_contact,
            event_type, event_date, location, is_out_of_station,
            delivery_deadline, status, remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (project_code) DO UPDATE
            SET status = EXCLUDED.status
          RETURNING id;
          `,
          [
            p.code, p.name, p.client, p.contact,
            p.eventType, p.eventDate, p.location, p.isOutOfStation,
            p.deadline, p.status, p.remarks
          ]
        );
        createdProjectIds[p.code] = projRes.rows[0].id;
        console.log(`[Seed] Project ready: ${p.name} (${p.code})`);
      }

      // Assign staff to projects
      if (createdProjectIds['PRJ-2026-001'] && createdStaffIds['GFX-001']) {
        await txClient.query(`
          INSERT INTO project_assignments (project_id, staff_id, role)
          VALUES 
            ('${createdProjectIds['PRJ-2026-001']}', '${createdStaffIds['GFX-001']}', 'Lead'),
            ('${createdProjectIds['PRJ-2026-001']}', '${createdStaffIds['GFX-002']}', 'Photographer'),
            ('${createdProjectIds['PRJ-2026-001']}', '${createdStaffIds['GFX-003']}', 'Videographer'),
            ('${createdProjectIds['PRJ-2026-001']}', '${createdStaffIds['GFX-004']}', 'Photo Editor')
          ON CONFLICT (project_id, staff_id, role) DO NOTHING;
        `);
      }

      // 4. Seed Baseline Work Entries (Approved and Submitted for testing reports)
      if (createdStaffIds['GFX-002'] && createdProjectIds['PRJ-2026-001']) {
        // Arjun Mehta: Wedding Shoot (Out of station + Late night) = 20 + 10 + 10 = 40 pts
        await txClient.query(`
          INSERT INTO work_entries (
            work_date, staff_id, project_id, work_type,
            quantity_or_duration, is_late_night, is_out_of_station,
            base_points, bonus_points, total_points, rule_version,
            calculation_snapshot, remarks, status, submitted_at, reviewed_by, reviewed_at
          )
          VALUES (
            '2026-10-20', '${createdStaffIds['GFX-002']}', '${createdProjectIds['PRJ-2026-001']}', 'Wedding Shoot',
            1.00, true, true,
            20.00, 20.00, 40.00, '1.0',
            '{"baseRate": 20, "lateNightBonus": 10, "outOfStationBonus": 10}'::jsonb,
            'Main ceremony coverage late night in Udaipur.', 'Approved',
            '2026-10-21 10:00:00+05:30', '${adminUserId}', '2026-10-21 14:00:00+05:30'
          )
          ON CONFLICT DO NOTHING;
        `);
      }

      if (createdStaffIds['GFX-004'] && createdProjectIds['PRJ-2026-001']) {
        // Neha Kapoor: Album Photo Edit = 40 sheets = 40 points
        await txClient.query(`
          INSERT INTO work_entries (
            work_date, staff_id, project_id, work_type,
            quantity_or_duration, is_late_night, is_out_of_station,
            base_points, bonus_points, total_points, rule_version,
            calculation_snapshot, remarks, status, submitted_at, reviewed_by, reviewed_at
          )
          VALUES (
            '2026-10-25', '${createdStaffIds['GFX-004']}', '${createdProjectIds['PRJ-2026-001']}', 'Album Photo Edit',
            40.00, false, false,
            40.00, 0.00, 40.00, '1.0',
            '{"baseRate": 1, "unit": "sheet", "quantity": 40}'::jsonb,
            'Designed 40 album sheets for Raj & Simran wedding album.', 'Approved',
            '2026-10-26 11:30:00+05:30', '${adminUserId}', '2026-10-26 15:00:00+05:30'
          )
          ON CONFLICT DO NOTHING;
        `);
      }

      if (createdStaffIds['GFX-005'] && createdProjectIds['PRJ-2026-002']) {
        // Amit Patel: Video Edit = 3.5 hours = 35 points
        await txClient.query(`
          INSERT INTO work_entries (
            work_date, staff_id, project_id, work_type,
            quantity_or_duration, is_late_night, is_out_of_station,
            base_points, bonus_points, total_points, rule_version,
            calculation_snapshot, remarks, status, submitted_at
          )
          VALUES (
            '2026-10-27', '${createdStaffIds['GFX-005']}', '${createdProjectIds['PRJ-2026-002']}', 'Video Edit',
            3.50, false, false,
            35.00, 0.00, 35.00, '1.0',
            '{"baseRate": 10, "unit": "hour", "hours": 3.5}'::jsonb,
            'Teaser video cut and color grading in DaVinci.', 'Submitted',
            '2026-10-27 18:00:00+05:30'
          )
          ON CONFLICT DO NOTHING;
        `);
      }
    });

    console.log('\n[Seed Success] Development seed completed successfully.');
    console.log('Credentials:');
    console.log('  Admin Login: admin@studiogfx.com / Admin@StudioGFX2026');
    console.log('  Staff Login: vikram.sharma@studiogfx.com / Staff@StudioGFX2026');
    console.log('----------------------------------------------------');
  } catch (error: any) {
    console.error('[Seed Error]:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module || process.argv[1]?.includes('seed')) {
  seedDatabase();
}

export default seedDatabase;

