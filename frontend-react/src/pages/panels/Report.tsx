import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Printer, Download } from "lucide-react";

function mdToHtml(md: string) {
  return md
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(?:<li>.*<\/li>\n?)+/g, m => "<ul>" + m + "</ul>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n\n/g, "<br/><br/>");
}

export default function Report() {
  const { currentFile, channel } = useAppStore();
  const [md, setMd] = useState("");

  useEffect(() => {
    if (!currentFile) return;
    api.reportMd(currentFile, channel).then(setMd);
  }, [currentFile, channel]);

  const downloadMd = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laudo_${(currentFile ?? "exame").replace(/\..*/, "")}.md`;
    a.click();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2 print:hidden">
        <Button variant="brand" onClick={() => window.print()}><Printer size={14} /> Imprimir</Button>
        <Button variant="ghost" onClick={downloadMd}><Download size={14} /> Baixar .md</Button>
      </div>
      <article
        className="bg-white text-neutral-800 rounded-xl p-12 max-w-3xl mx-auto shadow-card leading-relaxed"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <style>{`
          .report-body h1 { font-size: 26px; border-bottom: 3px solid #ff3b4a; padding-bottom: 8px; color: #000; }
          .report-body h2 { font-size: 17px; margin-top: 26px; color: #222; }
          .report-body h3 { font-size: 14px; color: #444; margin-top: 14px; }
          .report-body ul { margin: 4px 0 12px 20px; }
          .report-body blockquote { background: #fafafa; border-left: 3px solid #ff3b4a; padding: 8px 14px; color: #666; font-style: italic; margin: 12px 0; }
        `}</style>
        <div className="report-body" dangerouslySetInnerHTML={{ __html: mdToHtml(md) }} />
      </article>
    </div>
  );
}
