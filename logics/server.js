import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.resolve();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "../public")));

// ===========================
// Email Transporter (Gmail)
// ===========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // your email
    pass: process.env.EMAIL_PASS,  // app password
  },
});

// Send Email Function
async function sendEmail({ to, subject, html, attachments }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("❗ Email credentials missing → Email sending skipped.");
    return { messageId: "mock-id" };
  }

  return await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
    attachments,
  });
}

// ===========================
// Generate PDF (Preview or Email)
// ===========================
app.post("/generate-bill", async (req, res) => {
  const mode = req.query.mode; // "preview" or "email"
  const { customerName, customerEmail, items, total } = req.body;

  // Load invoice HTML template
  const templatePath = path.join(__dirname, "../templates/bills.html");
  let html = fs.readFileSync(templatePath, "utf8");

  html = html.replace(/{{customerName}}/g, customerName)
             .replace(/{{total}}/g, total);

  const rows = items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>₹${item.price}</td>
      <td>₹${item.qty * item.price}</td>
    </tr>
  `).join("");

  html = html.replace(/{{rows}}/g, rows);

  try {
    // Generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    // =======================
    // 1️⃣ EMAIL MODE
    // =======================
    if (mode === "email") {
      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email missing" });
      }

      await sendEmail({
        to: customerEmail,
        subject: "Your Bill - PDF Attached",
        html: `<p>Hello <strong>${customerName}</strong>,</p>
               <p>Please find your attached bill.</p>`,
        attachments: [{ filename: "bill.pdf", content: pdfBuffer }],
      });

      console.log("📧 Email sent to:", customerEmail);
      return res.json({ success: true, message: "Email sent!" });
    }

    // =======================
    // 2️⃣ PREVIEW MODE
    // =======================
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=bill.pdf",
    });

    return res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error generating PDF");
  }
});

// ===========================
// Start Server
// ===========================
app.listen(process.env.PORT || 5000, () =>
  console.log("🚀 Server running at http://localhost:5000")
);
