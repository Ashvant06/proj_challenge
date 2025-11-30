import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.resolve();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Serve public folder (public/index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, "public")));

// ===========================
// Puppeteer / Chromium setup
// ===========================
const isLocal =
  process.env.NODE_ENV === "development" ||
  process.platform === "win32" ||
  process.platform === "darwin";

let puppeteer;
let chromium;

if (isLocal) {
  // Full Puppeteer for local dev
  puppeteer = await import("puppeteer").then(m => m.default || m);
} else {
  // Lightweight combo for serverless / Render
  chromium = await import("@sparticuz/chromium").then(m => m.default || m);
  puppeteer = await import("puppeteer-core").then(m => m.default || m);
}

// ===========================
// Email Transporter (Gmail)
// ===========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send Email Function
async function sendEmail({ to, subject, html, attachments }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("❗ Email credentials missing → Email skipped.");
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

// Helper to get a browser instance
async function getBrowser() {
  if (isLocal) {
    console.log("🚀 Launching local Puppeteer");
    return await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } else {
    console.log("🚀 Launching Chromium via @sparticuz/chromium");
    const executablePath = await chromium.executablePath();
    console.log("Chromium executablePath:", executablePath);

    return await puppeteer.launch({
      executablePath,
      args: chromium.args,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });
  }
}

// ===========================
// Generate PDF (Preview or Email)
// ===========================
app.post("/generate-bill", async (req, res) => {
  const mode = req.query.mode; // "preview" or "email"
  const { customerName, customerEmail, items, total } = req.body;

  // Load HTML template
  const templatePath = path.join(__dirname, "templates/bills.html");
  let html = fs.readFileSync(templatePath, "utf8");

  html = html
    .replace(/{{customerName}}/g, customerName)
    .replace(/{{total}}/g, total);

  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>₹${item.price}</td>
      <td>₹${item.qty * item.price}</td>
    </tr>
  `
    )
    .join("");

  html = html.replace(/{{rows}}/g, rows);

  let browser;

  try {
    browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // EMAIL MODE
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

    // PREVIEW MODE
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=bill.pdf",
    });

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    return res.status(500).send("Error generating PDF");
  }
});

// ===========================
// Start Server
// ===========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
