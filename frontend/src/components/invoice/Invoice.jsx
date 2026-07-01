import React, { useRef } from "react";
import { formatDateAndTime } from "../../utils/index";

const URDU_NOTES = [
  "کاؤنٹر چھوڑنے کے بعد کوئی شکایت قابل قبول نہ ہوگی۔",
  "تیار شدہ آرڈر واپس یا تبدیل نہیں ہوگا۔",
  "ہمارے ریسٹورنٹ میں تشریف لانے کا شکریہ، دوبارہ ضرور آئیں۔",
];

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);
  const bills = orderInfo.bills || {};
  const c = orderInfo.customerDetails || {};
  const items = orderInfo.items || [];

  const handlePrint = () => {
    const itemRows = items
      .map(
        (it) => `
        <tr>
          <td class="qty">${it.quantity}</td>
          <td class="name">${it.name}</td>
          <td class="num">${Number(it.pricePerQuantity || it.price / it.quantity).toFixed(0)}</td>
          <td class="num">${Number(it.price).toFixed(0)}</td>
        </tr>`
      )
      .join("");

    const urdu = URDU_NOTES.map((n) => `<div class="urdu">${n}</div>`).join("");

    const html = `
      <div class="center">
        <div class="title">ZAIR ZABAR</div>
        <div class="muted">Vital Market 50 Wala Road, Near Sarim Hospital, Haroonabad</div>
        <div class="muted">Cell #: 03194562211</div>
        <div class="muted">Timing: 12:00 PM - 4:00 AM</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span>Bill #: ${orderInfo._id ? orderInfo._id.slice(-6).toUpperCase() : "—"}</span><span>${formatDateAndTime(orderInfo.orderDate)}</span></div>
      <div class="row"><span>Customer: ${c.name || "—"}</span><span>${orderInfo.orderType || ""}</span></div>
      <table class="items">
        <thead>
          <tr><th class="qty">QTY</th><th class="name">PRODUCT NAME</th><th class="num">RATE</th><th class="num">AMOUNT</th></tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="divider"></div>
      <div class="row"><span>Total Items: ${items.length}</span><span>Gross: ${Number(bills.total || 0).toFixed(0)}</span></div>
      ${bills.discount > 0 ? `<div class="row"><span></span><span>Discount: ${Number(bills.discount).toFixed(0)}</span></div>` : ""}
      <div class="totalbar"><span>TOTAL BILL</span><span>Rs ${Number(bills.totalWithTax || 0).toFixed(0)}</span></div>
      <div class="row pay"><span>Payment: ${orderInfo.paymentMethod || "—"}${orderInfo.paymentStatus ? " · " + orderInfo.paymentStatus : ""}</span></div>
      ${orderInfo.notes ? `<div class="row"><span>Notes: ${orderInfo.notes}</span></div>` : ""}
      <div class="divider"></div>
      <div class="urdu-block">${urdu}</div>
    `;

    const WinPrint = window.open("", "", "width=400,height=680");
    WinPrint.document.write(`
      <html>
        <head>
          <title>Zair Zabar - Receipt</title>
          <style>
            /* Optimized for 80mm thermal (SPEED-X SP-210UL). 1-bit printer:
               no antialiasing (avoids gray/shadowy edges), normal weight, mm/pt sizing. */
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; -webkit-font-smoothing: none; -moz-osx-font-smoothing: unset; text-rendering: optimizeLegibility; }
            html, body { margin: 0; padding: 0; }
            body { width: 72mm; margin: 0 auto; padding: 2mm 2mm 5mm; color: #000; background: #fff;
                   font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-variant-numeric: tabular-nums;
                   font-size: 11pt; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .center { text-align: center; }
            .title { font-size: 16pt; font-weight: 700; letter-spacing: 0.5pt; }
            .muted { font-size: 8.5pt; line-height: 1.3; }
            .divider { border-top: 1px dashed #000; margin: 2mm 0; }
            .row { display: flex; justify-content: space-between; gap: 3mm; font-size: 10pt; margin: 1mm 0; }
            table.items { width: 100%; border-collapse: collapse; margin: 1.5mm 0; font-size: 10pt; }
            table.items th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 1mm 0.5mm; text-align: left; font-weight: 700; }
            table.items td { padding: 0.9mm 0.5mm; vertical-align: top; }
            .qty { width: 7mm; }
            .num { text-align: right; white-space: nowrap; }
            .name { text-align: left; }
            .totalbar { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 13pt; padding: 1.5mm 0; margin: 1.5mm 0; border-top: 1pt solid #000; border-bottom: 1pt solid #000; }
            .pay { font-size: 10pt; margin-top: 1mm; }
            .urdu-block { margin-top: 2mm; direction: rtl; }
            .urdu { font-size: 12pt; text-align: center; line-height: 2; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    WinPrint.document.close();
    WinPrint.focus();
    setTimeout(() => {
      WinPrint.print();
      WinPrint.close();
    }, 400);
  };

  const rate = (it) => Number(it.pricePerQuantity || it.price / it.quantity).toFixed(0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-lg w-[340px] max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto flex-1 px-5 py-4 text-gray-900 [font-variant-numeric:tabular-nums]" ref={invoiceRef}>
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-widest">ZAIR ZABAR</h2>
            <p className="text-[10px] leading-tight mt-1">Vital Market 50 Wala Road, Near Sarim Hospital, Haroonabad</p>
            <p className="text-[10px]">Cell #: 03194562211</p>
            <p className="text-[10px]">Timing: 12:00 PM - 4:00 AM</p>
          </div>

          <div className="border-t border-dashed border-gray-500 my-2" />

          <div className="flex justify-between text-xs">
            <span>Bill #: {orderInfo._id ? orderInfo._id.slice(-6).toUpperCase() : "—"}</span>
            <span>{formatDateAndTime(orderInfo.orderDate)}</span>
          </div>
          <div className="flex justify-between text-xs mt-0.5">
            <span>Customer: {c.name || "—"}</span>
            <span>{orderInfo.orderType || ""}</span>
          </div>

          {/* Items table */}
          <table className="w-full text-xs mt-2" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="border-y border-dashed border-gray-500">
                <th className="text-left py-1 w-7">QTY</th>
                <th className="text-left py-1">PRODUCT NAME</th>
                <th className="text-right py-1">RATE</th>
                <th className="text-right py-1">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1">{it.quantity}</td>
                  <td className="py-1 pr-1">{it.name}</td>
                  <td className="py-1 text-right whitespace-nowrap">{rate(it)}</td>
                  <td className="py-1 text-right whitespace-nowrap">{Number(it.price).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-gray-500 my-2" />

          <div className="flex justify-between text-xs">
            <span>Total Items: {items.length}</span>
            <span>Gross: {Number(bills.total || 0).toFixed(0)}</span>
          </div>
          {bills.discount > 0 && (
            <div className="flex justify-end text-xs mt-0.5">
              <span>Discount: {Number(bills.discount).toFixed(0)}</span>
            </div>
          )}

          {/* Total bill — bold double rule (thermal-friendly) */}
          <div className="flex justify-between items-center font-bold text-lg py-2 my-2 border-y-[3px] border-double border-black">
            <span>TOTAL BILL</span>
            <span>Rs {Number(bills.totalWithTax || 0).toFixed(0)}</span>
          </div>

          <div className="text-xs">Payment: {orderInfo.paymentMethod || "—"}{orderInfo.paymentStatus ? ` · ${orderInfo.paymentStatus}` : ""}</div>
          {orderInfo.notes && <div className="text-xs mt-0.5">Notes: {orderInfo.notes}</div>}

          <div className="border-t border-dashed border-gray-500 my-2" />

          {/* Urdu footer */}
          <div dir="rtl" className="space-y-1.5">
            {URDU_NOTES.map((n, i) => (
              <p key={i} className="text-xs text-center leading-relaxed">{n}</p>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-500 mt-3">— Thank you, visit again —</p>
        </div>

        <div className="flex gap-2 p-3 border-t shrink-0">
          <button onClick={handlePrint} className="bg-[#025cca] text-white px-4 py-2 rounded-lg text-sm font-semibold w-full">
            Print Receipt
          </button>
          <button onClick={() => setShowInvoice(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
