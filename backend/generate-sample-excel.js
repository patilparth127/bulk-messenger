/**
 * Generate Sample Excel Contacts File
 * Run: node generate-sample-excel.js
 */

const xlsx = require("xlsx");

const contacts = [
  { Name: "Raj Patel", Email: "raj.patel@example.com", Phone: "9876543210", Gender: "male" },
  { Name: "Priya Shah", Email: "priya.shah@example.com", Phone: "9123456789", Gender: "female" },
  { Name: "Amit Kumar", Email: "amit.kumar@example.com", Phone: "8765432109", Gender: "male" },
  { Name: "Neha Sharma", Email: "neha.sharma@example.com", Phone: "9988776655", Gender: "female" },
  { Name: "Vikram Singh", Email: "vikram.singh@example.com", Phone: "7654321098", Gender: "male" },
  { Name: "Anjali Mehta", Email: "anjali.mehta@example.com", Phone: "9871234567", Gender: "female" },
  { Name: "Sanjay Gupta", Email: "sanjay.gupta@example.com", Phone: "8899001122", Gender: "male" },
  { Name: "Divya Joshi", Email: "divya.joshi@example.com", Phone: "", Gender: "female" },
  { Name: "Ravi Reddy", Email: "ravi.reddy@example.com", Phone: "9000111222", Gender: "male" },
  { Name: "Pooja Nair", Email: "pooja.nair@example.com", Phone: "8111222333", Gender: "female" },
];

// Convert JSON → Sheet
const ws = xlsx.utils.json_to_sheet(contacts);

// Optional: auto column width fix (nice UX)
const colWidths = Object.keys(contacts[0]).map(key => ({
  wch: Math.max(key.length, 15)
}));
ws["!cols"] = colWidths;

// Create workbook
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Contacts");

// Save file
const fileName = "sample-contacts.xlsx";
xlsx.writeFile(wb, fileName);

console.log(`✅ ${fileName} created successfully!`);
console.log(`📌 Total contacts: ${contacts.length}`);