const { sequelize, User, Contact, Call, CallNote } = require('../models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const seed = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced');

    const existingUser = await User.findOne({ where: { email: 'demo@dialer.com' } });
    if (existingUser) {
      console.log('Demo user already exists. Skipping seed.');
      console.log('Seeding complete');
      return;
    }

    const demoUser = await User.create({
      name: 'Demo Agent',
      email: 'demo@dialer.com',
      password: 'password123',
      role: 'agent',
    });
    console.log('Demo user created');

    const contacts = await Contact.bulkCreate([
      { userId: demoUser.id, name: 'John Smith', phone: '+1-555-0101', email: 'john.smith@techcorp.com', company: 'TechCorp Inc', status: 'new' },
      { userId: demoUser.id, name: 'Sarah Johnson', phone: '+1-555-0102', email: 'sarah.j@globaltech.io', company: 'GlobalTech', status: 'contacted' },
      { userId: demoUser.id, name: 'Michael Brown', phone: '+1-555-0103', email: 'mbrown@innovate.co', company: 'Innovate Co', status: 'interested' },
      { userId: demoUser.id, name: 'Emily Davis', phone: '+1-555-0104', email: 'emily.d@startup.io', company: 'Startup Labs', status: 'not_interested' },
      { userId: demoUser.id, name: 'David Wilson', phone: '+1-555-0105', email: 'd.wilson@enterprise.com', company: 'Enterprise Solutions', status: 'new' },
      { userId: demoUser.id, name: 'Jessica Martinez', phone: '+1-555-0106', email: 'jmartinez@cloudserv.net', company: 'CloudServ', status: 'contacted' },
      { userId: demoUser.id, name: 'Robert Taylor', phone: '+1-555-0107', email: 'rtaylor@dataflow.com', company: 'DataFlow Inc', status: 'interested' },
      { userId: demoUser.id, name: 'Amanda Anderson', phone: '+1-555-0108', email: 'a.anderson@nexgen.tech', company: 'NexGen Tech', status: 'new' },
      { userId: demoUser.id, name: 'Christopher Lee', phone: '+1-555-0109', email: 'chris.lee@brightworks.co', company: 'BrightWorks', status: 'contacted' },
      { userId: demoUser.id, name: 'Jennifer White', phone: '+1-555-0110', email: 'jwhite@innovative.io', company: 'Innovative Solutions', status: 'not_interested' },
      { userId: demoUser.id, name: 'Daniel Harris', phone: '+1-555-0111', email: 'dharris@smarttech.com', company: 'SmartTech', status: 'interested' },
      { userId: demoUser.id, name: 'Michelle Clark', phone: '+1-555-0112', email: 'mclark@digitalsys.net', company: 'Digital Systems', status: 'new' },
      { userId: demoUser.id, name: 'Kevin Lewis', phone: '+1-555-0113', email: 'k.lewis@futureinc.co', company: 'Future Inc', status: 'contacted' },
      { userId: demoUser.id, name: 'Laura Robinson', phone: '+1-555-0114', email: 'lrobinson@webdev.io', company: 'WebDev Agency', status: 'interested' },
      { userId: demoUser.id, name: 'Steven Hall', phone: '+1-555-0115', email: 'shall@codeworks.com', company: 'CodeWorks', status: 'new' },
    ]);
    console.log('15 contacts created');

    const callStatuses = ['ended', 'ended', 'ended', 'connected', 'missed'];
    const durations = [120, 180, 300, 240, 90, 150, 420, 60, 200, 360];

    const calls = [];
    for (let i = 0; i < 10; i++) {
      const contactIndex = i % contacts.length;
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - Math.floor(i / 2));
      startTime.setHours(9 + (i % 8), Math.floor(Math.random() * 60), 0, 0);

      const duration = durations[i];
      const endTime = new Date(startTime.getTime() + duration * 1000);

      const call = await Call.create({
        contactId: contacts[contactIndex].id,
        userId: demoUser.id,
        startTime,
        endTime,
        duration,
        status: callStatuses[i % callStatuses.length],
      });
      calls.push(call);
    }
    console.log('10 calls created');

    const notes = [
      { callIndex: 0, content: 'Customer is interested in our enterprise plan. Wants to discuss pricing next week.', aiSummary: 'Customer expressed strong interest. Recommended following up within 48 hours.' },
      { callIndex: 1, content: 'Left voicemail. Will try again tomorrow.', aiSummary: 'Customer requested callback. Schedule follow-up for next week.' },
      { callIndex: 2, content: 'Demo scheduled for next Thursday. Send over the presentation materials.', aiSummary: 'Call completed. Review notes for next steps.' },
      { callIndex: 3, content: 'Customer said no to current pricing but might reconsider in Q4.', aiSummary: 'Customer declined. Mark as not interested and remove from active pipeline.' },
      { callIndex: 4, content: 'Follow up call - they want to see case studies before making decision.', aiSummary: 'Customer requested callback. Schedule follow-up for next week.' },
      { callIndex: 5, content: 'Very interested in the new features. Ready to sign contract.', aiSummary: 'Customer expressed strong interest. Recommended following up within 48 hours.' },
      { callIndex: 6, content: 'General inquiry. No immediate need but keep on mailing list.', aiSummary: 'Call completed. Review notes for next steps.' },
      { callIndex: 7, content: 'Scheduled a callback for next week to discuss requirements.', aiSummary: 'Customer requested callback. Schedule follow-up for next week.' },
      { callIndex: 8, content: 'Not interested in expanding right now due to budget constraints.', aiSummary: 'Customer declined. Mark as not interested and remove from active pipeline.' },
      { callIndex: 9, content: 'Hot lead! Decision maker is ready to buy. Prepare proposal ASAP.', aiSummary: 'Customer expressed strong interest. Recommended following up within 48 hours.' },
    ];

    for (const noteData of notes) {
      await CallNote.create({
        callId: calls[noteData.callIndex].id,
        userId: demoUser.id,
        content: noteData.content,
        aiSummary: noteData.aiSummary,
      });
    }
    console.log('Notes created for calls');

    console.log('Seeding complete');
  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  }
};

seed();
