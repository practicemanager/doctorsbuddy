import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";

interface InvoiceReceiptProps {
  invoice: any;
  clinic: any;
  patient: any;
  items?: any[];
}

export default function InvoiceReceipt({ invoice, clinic, patient, items = [] }: InvoiceReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const subtotal = Number(invoice.subtotal || invoice.amount);
  const discountAmt = Number(invoice.discount_amount || 0);
  const discountPct = Number(invoice.discount_percent || 0);
  const discountTotal = discountAmt + (subtotal * discountPct / 100);
  const taxRate = Number(invoice.tax_rate || 0);
  const taxAmount = Number(invoice.tax_amount || 0);
  const totalAmount = Number(invoice.amount);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Receipt #${invoice.id.slice(0, 8)}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;font-size:12px;color:#1a1a1a;max-width:800px;margin:0 auto}
        h1{font-size:20px;margin:0}h2{font-size:14px;margin:16px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
        th{background:#f5f5f5;font-weight:600}
        .header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
        .amount-box{background:#f0fdf4;border:2px solid #22c55e;border-radius:8px;padding:12px;text-align:center;margin:16px 0}
        .amount-box .label{font-size:11px;color:#666}.amount-box .value{font-size:24px;font-weight:bold;color:#16a34a}
        .footer{margin-top:32px;display:flex;justify-content:space-between;font-size:10px;color:#999}
        .paid-stamp{color:#22c55e;font-size:32px;font-weight:bold;transform:rotate(-12deg);opacity:0.3;position:absolute;top:50%;right:10%}
        @media print{body{padding:12px}.paid-stamp{opacity:0.2}}
      </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleDownload = () => {
    const el = printRef.current;
    if (!el) return;
    const blob = new Blob([`<html><body style="font-family:system-ui;padding:24px;font-size:12px;max-width:800px;margin:0 auto">${el.innerHTML}</body></html>`], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt_${patient?.full_name}_${new Date(invoice.created_at).toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1">
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1">
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
      </div>

      <div ref={printRef} style={{ position: "relative" }}>
        {invoice.status === "paid" && (
          <div style={{ color: "#22c55e", fontSize: 48, fontWeight: "bold", transform: "rotate(-12deg)", opacity: 0.15, position: "absolute", top: "40%", right: "5%", pointerEvents: "none" }}>
            PAID
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #333", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0 }}>{clinic?.name || "Dental Clinic"}</h1>
            {clinic?.address && <p style={{ fontSize: 11, color: "#666", margin: "2px 0" }}>{clinic.address}</p>}
            <p style={{ fontSize: 11, color: "#666", margin: 0 }}>
              {[clinic?.phone, clinic?.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#333", borderBottom: "none" }}>RECEIPT</h2>
            <p style={{ fontSize: 11, margin: "4px 0" }}><strong>Receipt #:</strong> {invoice.id.slice(0, 8).toUpperCase()}</p>
            <p style={{ fontSize: 11, margin: 0 }}><strong>Date:</strong> {new Date(invoice.created_at).toLocaleDateString("en-IN")}</p>
            {invoice.paid_at && <p style={{ fontSize: 11, margin: 0 }}><strong>Paid:</strong> {new Date(invoice.paid_at).toLocaleDateString("en-IN")}</p>}
          </div>
        </div>

        {/* Patient Info */}
        <div style={{ background: "#f9fafb", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 12 }}>
          <p style={{ margin: 0 }}><strong>Patient:</strong> {patient?.full_name}</p>
          {patient?.phone && <p style={{ margin: "2px 0" }}><strong>Phone:</strong> {patient.phone}</p>}
          {patient?.email && <p style={{ margin: 0 }}><strong>Email:</strong> {patient.email}</p>}
        </div>

        {/* Amount Box */}
        <div style={{ background: invoice.status === "paid" ? "#f0fdf4" : "#fef3c7", border: `2px solid ${invoice.status === "paid" ? "#22c55e" : "#f59e0b"}`, borderRadius: 8, padding: 16, textAlign: "center", margin: "16px 0" }}>
          <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>
            {invoice.status === "paid" ? "Amount Paid" : "Amount Due"}
          </div>
          <div style={{ fontSize: 28, fontWeight: "bold", color: invoice.status === "paid" ? "#16a34a" : "#d97706" }}>
            ₹{amount.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Items table if available */}
        {items.length > 0 && (
          <>
            <h2 style={{ fontSize: 13, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>Treatment Details</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ border: "1px solid #ddd", padding: "5px 8px" }}>Description</th>
                  <th style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "center" }}>Qty</th>
                  <th style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right" }}>Unit Price</th>
                  <th style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #ddd", padding: "5px 8px" }}>{item.description}</td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right" }}>₹{Number(item.unit_price).toLocaleString()}</td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right" }}>₹{(item.quantity * Number(item.unit_price)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Summary */}
        <div style={{ marginTop: 16, borderTop: "1px solid #ddd", paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
            <span>Subtotal</span><span style={{ fontWeight: 600 }}>₹{amount.toLocaleString("en-IN")}</span>
          </div>
          {gstRate > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
              <span>GST ({gstRate}%)</span><span>₹{gstAmount.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "bold", padding: "8px 0", borderTop: "2px solid #333" }}>
            <span>Total</span><span>₹{totalWithGst.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginTop: 12, fontSize: 11, color: "#666" }}>
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 10, color: "#999" }}>
            <p style={{ margin: 0 }}>Generated on {new Date().toLocaleString("en-IN")}</p>
            <p style={{ margin: 0 }}>This is a computer-generated receipt.</p>
          </div>
          <div style={{ borderTop: "1px solid #333", paddingTop: 4, textAlign: "center", width: 180, fontSize: 11 }}>
            Authorized Signature
          </div>
        </div>
      </div>
    </div>
  );
}
