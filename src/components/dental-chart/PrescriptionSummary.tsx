import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, Share2, CheckCircle2, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import type { Medication } from "./MedicationPanel";

interface PrescriptionSummaryProps {
  patient: any;
  clinic: any;
  chiefComplaint: string;
  gumCondition: string;
  alignmentCondition: string;
  diagnosisNotes: string;
  treatmentPlan: string;
  medications: Medication[];
  items: any[];
  status: string;
  onConfirm: () => void;
  isConfirming: boolean;
}

export default function PrescriptionSummary({
  patient, clinic, chiefComplaint, gumCondition, alignmentCondition,
  diagnosisNotes, treatmentPlan, medications, items, status, onConfirm, isConfirming,
}: PrescriptionSummaryProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const totalCost = items.reduce((s: number, i: any) => s + Number(i.cost || 0), 0);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Prescription - ${patient?.full_name}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:20px;font-size:12px;color:#1a1a1a}
        h1{font-size:18px;margin:0}h2{font-size:14px;margin:12px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
        th{background:#f5f5f5;font-weight:600}.header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:15px}
        .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;background:#e5e7eb;margin-right:4px}
        .rx{font-size:24px;font-weight:bold;color:#2563eb;margin-right:8px}
        @media print{body{padding:10px}}
      </style></head><body>${printContent.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let y = 15;
    const lm = 15;
    const pw = 180;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(clinic?.name || "Dental Clinic", lm, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (clinic?.address) { doc.text(clinic.address, lm, y); y += 4; }
    if (clinic?.phone || clinic?.email) { doc.text(`${clinic?.phone || ""} · ${clinic?.email || ""}`, lm, y); y += 4; }

    // Patient info on right
    doc.setFontSize(9);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, lm + pw, 15, { align: "right" });
    doc.text(`Patient: ${patient?.full_name || ""}`, lm + pw, 19, { align: "right" });
    if (patient?.phone) doc.text(`Ph: ${patient.phone}`, lm + pw, 23, { align: "right" });

    y += 2;
    doc.setDrawColor(51);
    doc.setLineWidth(0.5);
    doc.line(lm, y, lm + pw, y);
    y += 8;

    // Chief Complaint
    if (chiefComplaint) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Chief Complaint", lm, y); y += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(chiefComplaint, pw);
      doc.text(lines, lm, y); y += lines.length * 4 + 4;
    }

    // Clinical notes
    if (gumCondition && gumCondition !== "normal") { doc.text(`Gum: ${gumCondition}`, lm, y); y += 4; }
    if (alignmentCondition && alignmentCondition !== "normal") { doc.text(`Alignment: ${alignmentCondition}`, lm, y); y += 4; }
    if (diagnosisNotes) {
      const lines = doc.splitTextToSize(`Clinical Notes: ${diagnosisNotes}`, pw);
      doc.text(lines, lm, y); y += lines.length * 4 + 4;
    }

    // Dental findings table
    if (items.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Dental Findings & Treatment", lm, y); y += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      // Table header
      const cols = [lm, lm + 20, lm + 60, lm + 100, lm + 140];
      const heads = ["Tooth", "Condition", "Treatment", "Status", "Cost"];
      doc.setFillColor(245, 245, 245);
      doc.rect(lm, y - 3, pw, 6, "F");
      heads.forEach((h, i) => doc.text(h, cols[i], y));
      y += 5;

      items.forEach((item: any) => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(String(item.tooth_number), cols[0], y);
        doc.text(item.condition || "—", cols[1], y);
        doc.text(item.treatment || "—", cols[2], y);
        doc.text(item.treatment_status?.replace("_", " ") || "—", cols[3], y);
        doc.text(item.cost > 0 ? `₹${Number(item.cost).toLocaleString()}` : "—", cols[4], y);
        y += 5;
      });
      doc.setFont("helvetica", "bold");
      doc.text("Total", cols[3], y);
      doc.text(`₹${totalCost.toLocaleString()}`, cols[4], y);
      y += 8;
      doc.setFont("helvetica", "normal");
    }

    // Treatment Plan
    if (treatmentPlan) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Treatment Plan", lm, y); y += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(treatmentPlan, pw);
      doc.text(lines, lm, y); y += lines.length * 4 + 4;
    }

    // Medications
    if (medications.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("℞", lm, y);
      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.text("Medications", lm + 10, y); y += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      const mcols = [lm, lm + 10, lm + 70, lm + 110, lm + 145];
      const mheads = ["#", "Medicine", "Dosage", "Frequency", "Duration"];
      doc.setFillColor(245, 245, 245);
      doc.rect(lm, y - 3, pw, 6, "F");
      mheads.forEach((h, i) => doc.text(h, mcols[i], y));
      y += 5;

      medications.forEach((med, idx) => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(String(idx + 1), mcols[0], y);
        doc.text(med.name, mcols[1], y);
        doc.text(med.dosage, mcols[2], y);
        doc.text(med.frequency, mcols[3], y);
        doc.text(med.duration, mcols[4], y);
        y += 5;
      });
      y += 4;
    }

    // Signature
    if (y > 260) { doc.addPage(); y = 15; }
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(153);
    doc.text(`Generated on ${new Date().toLocaleString()}`, lm, y);
    doc.setTextColor(0);
    doc.line(lm + 120, y - 2, lm + pw, y - 2);
    doc.setFontSize(9);
    doc.text("Doctor's Signature", lm + 130, y + 3);

    doc.save(`Prescription_${patient?.full_name}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF downloaded");
  };

  const handleDownload = () => {
    handleDownloadPDF();
  };

  const handleShare = async () => {
    const text = `Prescription for ${patient?.full_name}\nDate: ${new Date().toLocaleDateString()}\n\nChief Complaint: ${chiefComplaint}\n\nMedications:\n${medications.map((m, i) => `${i + 1}. ${m.name} - ${m.dosage} - ${m.frequency} - ${m.duration}`).join("\n")}\n\nTreatment Plan: ${treatmentPlan}`;
    if (navigator.share) {
      await navigator.share({ title: "Dental Prescription", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Prescription copied to clipboard");
    }
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base">Prescription Summary</CardTitle>
          <div className="flex gap-1.5">
            {status === "draft" && (
              <Button size="sm" onClick={onConfirm} disabled={isConfirming} className="gap-1">
                <CheckCircle2 className="h-3 w-3" />{isConfirming ? "Confirming..." : "Confirm"}
              </Button>
            )}
            {status === "confirmed" && <Badge className="bg-emerald-100 text-emerald-800">Confirmed</Badge>}
            <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={handleDownload}><Download className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={handleShare}><Share2 className="h-3 w-3" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Printable content */}
        <div ref={printRef}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #333", paddingBottom: 10, marginBottom: 15 }}>
            <div>
              <h1 style={{ margin: 0 }}>{clinic?.name || "Dental Clinic"}</h1>
              <p style={{ fontSize: 11, color: "#666", margin: "2px 0" }}>{clinic?.address}</p>
              <p style={{ fontSize: 11, color: "#666", margin: 0 }}>{clinic?.phone} · {clinic?.email}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11 }}><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              <p style={{ fontSize: 11 }}><strong>Patient:</strong> {patient?.full_name}</p>
              {patient?.phone && <p style={{ fontSize: 11 }}>Ph: {patient.phone}</p>}
            </div>
          </div>

          {chiefComplaint && (
            <div><h2 style={{ fontSize: 13, borderBottom: "1px solid #ccc", paddingBottom: 3 }}>Chief Complaint</h2><p>{chiefComplaint}</p></div>
          )}

          <div style={{ display: "flex", gap: 16 }}>
            {gumCondition && gumCondition !== "normal" && <p><strong>Gum:</strong> {gumCondition}</p>}
            {alignmentCondition && alignmentCondition !== "normal" && <p><strong>Alignment:</strong> {alignmentCondition}</p>}
          </div>
          {diagnosisNotes && <p><strong>Clinical Notes:</strong> {diagnosisNotes}</p>}

          {items.length > 0 && (
            <>
              <h2 style={{ fontSize: 13, borderBottom: "1px solid #ccc", paddingBottom: 3 }}>Dental Findings & Treatment</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Tooth</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Condition</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Treatment</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Status</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "center" }}>{item.tooth_number}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{item.condition || "—"}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{item.treatment || "—"}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{item.treatment_status?.replace("_", " ") || "—"}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right" }}>{item.cost > 0 ? `₹${Number(item.cost).toLocaleString()}` : "—"}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: "bold" }}>
                    <td colSpan={4} style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right" }}>Total</td>
                    <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "right" }}>₹{totalCost.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {treatmentPlan && (
            <div><h2 style={{ fontSize: 13, borderBottom: "1px solid #ccc", paddingBottom: 3 }}>Treatment Plan</h2><p>{treatmentPlan}</p></div>
          )}

          {medications.length > 0 && (
            <>
              <h2 style={{ fontSize: 13, borderBottom: "1px solid #ccc", paddingBottom: 3 }}><span style={{ fontSize: 20, fontWeight: "bold", color: "#2563eb", marginRight: 6 }}>℞</span>Medications</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>#</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Medicine</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Dosage</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Frequency</th>
                    <th style={{ border: "1px solid #ddd", padding: "4px 6px" }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((med, idx) => (
                    <tr key={idx}>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px", textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px", fontWeight: 500 }}>{med.name}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{med.dosage}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{med.frequency}</td>
                      <td style={{ border: "1px solid #ddd", padding: "4px 6px" }}>{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "#999" }}>Generated on {new Date().toLocaleString()}</div>
            <div style={{ borderTop: "1px solid #333", paddingTop: 4, textAlign: "center", width: 180, fontSize: 11 }}>Doctor's Signature</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
