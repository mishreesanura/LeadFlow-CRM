import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { LeadModel } from "./models/lead.model.js";

const now = new Date();

function seedDate(monthsAgo: number, day: number, hour = 10) {
  const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1, hour, 0, 0, 0);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, daysInMonth));

  return monthsAgo === 0 && date > now ? new Date(now) : date;
}

function addDays(date: Date, days: number, hour = 15) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, hour, 0, 0, 0);
  return next > now ? new Date(now) : next;
}

const leadTimelines = [
  { createdAt: seedDate(0, 3), lastContactedAt: addDays(seedDate(0, 3), 1) },
  { createdAt: seedDate(3, 7), lastContactedAt: addDays(seedDate(3, 7), 5) },
  { createdAt: seedDate(4, 11) },
  { createdAt: seedDate(2, 6), lastContactedAt: addDays(seedDate(2, 6), 10) },
  { createdAt: seedDate(5, 9) },
  { createdAt: seedDate(2, 18) },
  { createdAt: seedDate(1, 8), lastContactedAt: addDays(seedDate(1, 8), 4) },
  { createdAt: seedDate(1, 17), lastContactedAt: addDays(seedDate(1, 17), 3) },
  { createdAt: seedDate(4, 22), lastContactedAt: addDays(seedDate(4, 22), 12) },
  { createdAt: seedDate(1, 24) },
  { createdAt: seedDate(3, 16), lastContactedAt: addDays(seedDate(3, 16), 8) },
  { createdAt: seedDate(4, 5), lastContactedAt: addDays(seedDate(4, 5), 6) },
  { createdAt: seedDate(3, 24) },
  { createdAt: seedDate(5, 19), lastContactedAt: addDays(seedDate(5, 19), 9) },
  { createdAt: seedDate(0, 5) },
  { createdAt: seedDate(2, 26), lastContactedAt: addDays(seedDate(2, 26), 4) }
];

const sampleLeads = [
  {
    name: "Arjun Reddy",
    email: "arjun@bengalurutech.in",
    phone: "+91 98765 43210",
    company: "Bengaluru Tech Solutions",
    status: "Qualified",
    notes: "Requested a detailed quote for a 50-seat rollout for their new Hyderabad office.",
    source: "Website",
    priority: "High",
    estimatedValue: 240000,
    lastContactedAt: new Date()
  },
  {
    name: "Kavya Desai",
    email: "kavya@mumbaicreatives.com",
    phone: "+91 91234 56789",
    company: "Mumbai Creatives",
    status: "Contacted",
    notes: "Interested in replacing their old CRM. Met at the Delhi Tech Summit.",
    source: "Event",
    priority: "Medium",
    estimatedValue: 92000,
    lastContactedAt: new Date()
  },
  {
    name: "Aarav Sharma",
    email: "aarav@swasthya.in",
    phone: "+91 99887 77665",
    company: "Swasthya HealthTech",
    status: "New",
    notes: "Inbound demo request from pricing page.",
    source: "Inbound",
    priority: "Medium",
    estimatedValue: 150000
  },
  {
    name: "Rohan Mehta",
    email: "rohan@fintechbharat.com",
    phone: "+91 88990 01122",
    company: "Fintech Bharat",
    status: "Converted",
    notes: "Closed annual contract after founder-led demo. Payment received via UPI.",
    source: "Outbound",
    priority: "High",
    estimatedValue: 360000,
    lastContactedAt: new Date()
  },
  {
    name: "Priya Nair",
    email: "priya@chennailogistics.in",
    phone: "+91 90000 12345",
    company: "Chennai Logistics",
    status: "Lost",
    notes: "No budget this quarter. Looking for funding. Revisit after Diwali.",
    source: "Referral",
    priority: "Low",
    estimatedValue: 70000
  },
  {
    name: "Vikram Singh",
    email: "vikram@jaipurcrafts.com",
    phone: "+91 98761 11223",
    company: "Jaipur Crafts",
    status: "New",
    notes: "E-commerce expansion. Needs CRM to track wholesale inquiries.",
    source: "Website",
    priority: "Medium",
    estimatedValue: 120000
  },
  {
    name: "Ananya Rao",
    email: "ananya@puneinnovates.in",
    phone: "+91 88997 76655",
    company: "Pune Innovates",
    status: "Qualified",
    notes: "Requires integration with their local ERP system.",
    source: "Inbound",
    priority: "High",
    estimatedValue: 500000,
    lastContactedAt: new Date()
  },
  {
    name: "Rajesh Kumar",
    email: "rajesh@delhimegasol.com",
    phone: "+91 99881 22334",
    company: "Delhi Mega Solutions",
    status: "Contacted",
    notes: "Sent initial deck. Following up next week after their board meeting.",
    source: "Outbound",
    priority: "High",
    estimatedValue: 850000,
    lastContactedAt: new Date()
  },
  {
    name: "Neha Gupta",
    email: "neha@guptaenterprises.in",
    phone: "+91 91238 87654",
    company: "Gupta Enterprises",
    status: "Converted",
    notes: "Onboarding scheduled for next Monday.",
    source: "Referral",
    priority: "Low",
    estimatedValue: 45000,
    lastContactedAt: new Date()
  },
  {
    name: "Siddharth Verma",
    email: "sid@noidatechhub.com",
    phone: "+91 90011 22334",
    company: "Noida Tech Hub",
    status: "New",
    notes: "Dropped off at pricing page. Reach out with discount offer.",
    source: "Website",
    priority: "Medium",
    estimatedValue: 65000
  },
  {
    name: "Isha Patel",
    email: "isha@ahmedabadtrades.in",
    phone: "+91 87654 32109",
    company: "Ahmedabad Trades",
    status: "Qualified",
    notes: "Textile exporter looking to modernize their sales pipeline.",
    source: "Event",
    priority: "High",
    estimatedValue: 320000,
    lastContactedAt: new Date()
  },
  {
    name: "Karan Johar",
    email: "karan@mumbaiproductions.com",
    phone: "+91 99888 77766",
    company: "Mumbai Productions",
    status: "Contacted",
    notes: "Needs custom pipeline stages for production phases.",
    source: "Outbound",
    priority: "Medium",
    estimatedValue: 180000,
    lastContactedAt: new Date()
  },
  {
    name: "Smriti Irani",
    email: "smriti@bharattextiles.in",
    phone: "+91 91122 33445",
    company: "Bharat Textiles",
    status: "Lost",
    notes: "Went with a competitor due to pricing.",
    source: "Inbound",
    priority: "High",
    estimatedValue: 450000
  },
  {
    name: "Gaurav Sharma",
    email: "gaurav@gurugramconsulting.com",
    phone: "+91 98877 66554",
    company: "Gurugram Consulting",
    status: "Converted",
    notes: "Upgraded from basic to pro plan.",
    source: "Website",
    priority: "Medium",
    estimatedValue: 120000,
    lastContactedAt: new Date()
  },
  {
    name: "Aditi Iyer",
    email: "aditi@kochiwaters.in",
    phone: "+91 80099 88776",
    company: "Kochi Waters",
    status: "New",
    notes: "Requested a demo for their sales team of 10.",
    source: "Referral",
    priority: "Medium",
    estimatedValue: 95000
  },
  {
    name: "Rahul Dravid",
    email: "rahul@bengalurucricket.com",
    phone: "+91 99112 23344",
    company: "Bengaluru Sports Academy",
    status: "Qualified",
    notes: "Wants to track sponsorships and partner deals.",
    source: "Event",
    priority: "High",
    estimatedValue: 275000,
    lastContactedAt: new Date()
  }
];

async function seed() {
  await connectDatabase();
  await LeadModel.deleteMany({});
  await LeadModel.insertMany(
    sampleLeads.map((lead, index) => {
      const timeline = leadTimelines[index];
      const updatedAt = timeline.lastContactedAt ?? addDays(timeline.createdAt, 2);

      return {
        ...lead,
        ...timeline,
        updatedAt,
        statusHistory: [{ status: lead.status, changedAt: updatedAt, note: "Seed data" }]
      };
    })
  );
  await disconnectDatabase();
  console.log("Seeded leads.");
}

void seed().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
