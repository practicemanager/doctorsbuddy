import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileImage, Trash2, ZoomIn, X, FileText } from "lucide-react";

interface DocumentsTabProps {
  patientId: string;
  clinicId: string;
}

const DOC_TYPES = [
  { value: "xray", label: "X-Ray" },
  { value: "prescription", label: "Prescription" },
  { value: "report", label: "Report" },
  { value: "other", label: "Other" },
];

export default function DocumentsTab({ patientId, clinicId }: DocumentsTabProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("xray");
  const [toothNumber, setToothNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["patient-documents", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_documents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Select a file first");

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${clinicId}/${patientId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("patient-documents")
        .getPublicUrl(path);

      // For private buckets, use createSignedUrl instead
      const { data: signedData } = await supabase.storage
        .from("patient-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = signedData?.signedUrl || urlData.publicUrl;

      const { error: dbError } = await supabase.from("patient_documents").insert({
        patient_id: patientId,
        clinic_id: clinicId,
        document_type: docType,
        tooth_number: toothNumber ? parseInt(toothNumber) : null,
        file_url: path, // store path, generate signed URL on read
        file_name: file.name,
        notes: notes || null,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["patient-documents"] });
      toast.success("Document uploaded!");
      setNotes("");
      setToothNumber("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("patient-documents").remove([doc.file_url]);
      const { error } = await supabase.from("patient_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents"] });
      toast.success("Document deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const handleZoom = async (path: string) => {
    const url = await getSignedUrl(path);
    setZoomUrl(url);
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tooth # (optional)</Label>
              <Input
                type="number"
                placeholder="e.g. 11"
                value={toothNumber}
                onChange={e => setToothNumber(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input
                placeholder="Brief description..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground p-4">Loading documents...</p>
      ) : !documents.length ? (
        <Card className="shadow-card border-0">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileImage className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No documents uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="shadow-card border-0 overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {doc.document_type === "xray" ? (
                      <FileImage className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleZoom(doc.file_url)}
                    >
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteDoc.mutate(doc)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {DOC_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type}
                  </Badge>
                  {doc.tooth_number && (
                    <Badge variant="secondary" className="text-[10px]">
                      Tooth #{doc.tooth_number}
                    </Badge>
                  )}
                </div>
                {doc.notes && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{doc.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Zoom Dialog */}
      <Dialog open={!!zoomUrl} onOpenChange={() => setZoomUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {zoomUrl && (
            <div className="flex items-center justify-center max-h-[75vh] overflow-auto">
              <img src={zoomUrl} alt="Document" className="max-w-full max-h-[75vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
