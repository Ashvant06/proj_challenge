async function generatePDF() {
  const customerName = document.getElementById("customerName").value;
  const customerEmail = document.getElementById("customerEmail").value;
  if (!customerName || !customerEmail) return alert("Enter customer name and email");

  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  // Send POST request to server
  const res = await fetch("http://localhost:5000/generate-bill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName, customerEmail, items, total }),
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  // Preview PDF
  window.open(url);
}
