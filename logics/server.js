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

// Serve public folder (public/index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, "public")));

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

// Small helper to decide which Chrome executable to use
function getChromeExecutablePath() {
  // 1️⃣ If you set PUPPETEER_EXECUTABLE_PATH in Render env vars, use that
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log("Using Chrome from PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2️⃣ Otherwise, let Puppeteer decide (it will look in its cache dir)
  try {
    const p = puppeteer.executablePath();
    console.log("Using Puppeteer executablePath():", p);
    return p;
  } catch (e) {
    console.log("Could not resolve puppeteer.executablePath(), launching without it");
    return undefined;
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

  try {
    const launchOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
      ],
    };

    const executablePath = getChromeExecutablePath();
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    // Generate PDF
    const browser = await puppeteer.launch(launchOptions);

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
