let items = [];

function addItem() {
  const name = document.getElementById("itemName").value;
  const qty = Number(document.getElementById("qty").value);
  const price = Number(document.getElementById("price").value);

  if (!name || !qty || !price) return alert("Enter all fields");

  items.push({ name, qty, price });

  updateTable();

  document.getElementById("itemName").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
}

function updateTable() {
  const table = document.getElementById("itemTable");

  table.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Qty</th>
      <th>Price</th>
      <th>Total</th>
    </tr>
  `;

  let grand = 0;

  items.forEach(i => {
    const t = i.qty * i.price;
    grand += t;

    table.innerHTML += `
      <tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>₹${i.price}</td>
        <td>₹${t}</td>
      </tr>
    `;
  });

  document.getElementById("grandTotal").innerText = `Total: ₹${grand}`;
}

// =============================
// 1️⃣ Generate PDF (Preview Only)
// =============================

async function generatePDF() {
  const customerName = document.getElementById("customerName").value;
  if (!customerName) return alert("Enter customer name");

  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  const res = await fetch("http://localhost:5000/generate-bill?mode=preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName, items, total }),
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  window.open(url); // Preview only
}

// =============================
// 2️⃣ Send Email (No Preview)
// =============================
async function sendEmail() {
  const customerName = document.getElementById("customerName").value;
  const customerEmail = document.getElementById("customerEmail").value;

  if (!customerName || !customerEmail)
    return alert("Enter name and email");

  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  const res = await fetch("http://localhost:5000/generate-bill?mode=email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName, customerEmail, items, total }),
  });

  if (res.ok) alert("Email sent successfully!");
  else alert("Failed to send email");
}
