import { Injectable, Logger } from "@nestjs/common";
import { Project, Persona, Script } from "@prisma/client";

interface StoryboardStep {
  t: string;
  shot: string;
  onScreen: string;
  spoken: string;
  broll?: string[];
}

type ProjectWithPersonas = Project & { personas: Persona[] };

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  async generatePdf(
    project: ProjectWithPersonas,
    scripts: Script[],
    personaIds: string[] = [],
  ): Promise<Buffer> {
    // Dynamically import puppeteer to avoid issues if not installed
    let puppeteer: typeof import("puppeteer");
    try {
      puppeteer = await import("puppeteer");
    } catch (error) {
      this.logger.error("Puppeteer not installed. PDF export unavailable.");
      throw new Error("PDF export not available - puppeteer not installed");
    }

    // Filter personas to only those used in the batch
    const usedPersonas =
      personaIds.length > 0
        ? project.personas.filter((p) => personaIds.includes(p.id))
        : project.personas;

    const html = this.generateHtml(project, scripts, usedPersonas);

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "15mm",
          right: "12mm",
          bottom: "15mm",
          left: "12mm",
        },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private generateHtml(
    project: ProjectWithPersonas,
    scripts: Script[],
    usedPersonas: Persona[],
  ): string {
    const completedScripts = scripts.filter((s) => s.status === "completed");

    // Group scripts by angle
    const scriptsByAngle = completedScripts.reduce(
      (acc, script) => {
        if (!acc[script.angle]) {
          acc[script.angle] = [];
        }
        acc[script.angle].push(script);
        return acc;
      },
      {} as Record<string, Script[]>,
    );

    const personasList = usedPersonas
      .map((p) => `<li><strong>${p.name}</strong>: ${p.description}</li>`)
      .join("");

    const scriptsHtml = Object.entries(scriptsByAngle)
      .map(([angle, angleScripts]) => {
        const scriptCards = angleScripts
          .map((script) => this.renderScriptCard(script))
          .join("");

        return `
          <div class="angle-section">
            <h2 class="angle-title">${this.formatAngle(angle)}</h2>
            ${scriptCards}
          </div>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Scripts Pack - ${project.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 10px;
              line-height: 1.4;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #000;
            }
            .header h1 {
              font-size: 20px;
              margin-bottom: 3px;
            }
            .header p {
              color: #666;
              font-size: 11px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 8px;
              padding-bottom: 4px;
              border-bottom: 1px solid #ddd;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .summary-item {
              background: #f9f9f9;
              padding: 8px;
              border-radius: 4px;
              font-size: 9px;
            }
            .summary-item h4 {
              font-size: 9px;
              color: #666;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .summary-item p, .summary-item ul {
              font-size: 9px;
            }
            .angle-section {
              margin-bottom: 20px;
            }
            .angle-title {
              font-size: 13px;
              background: #000;
              color: #fff;
              padding: 6px 10px;
              margin-bottom: 10px;
              page-break-after: avoid;
            }
            .script-card {
              border: 1px solid #ddd;
              border-radius: 4px;
              margin-bottom: 15px;
              page-break-inside: auto;
            }
            .script-header {
              background: #f5f5f5;
              padding: 6px 10px;
              border-bottom: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              align-items: center;
              page-break-after: avoid;
            }
            .script-meta {
              display: flex;
              gap: 8px;
            }
            .script-meta span {
              background: #e0e0e0;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 9px;
            }
            .script-body {
              padding: 10px;
            }
            .hook {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 10px;
              padding: 8px;
              background: #fff3cd;
              border-radius: 4px;
              page-break-after: avoid;
            }
            .storyboard {
              margin-bottom: 10px;
            }
            .storyboard h4 {
              font-size: 10px;
              margin-bottom: 6px;
              page-break-after: avoid;
            }
            .storyboard-step {
              border-left: 2px solid #000;
              padding-left: 8px;
              margin-bottom: 6px;
              page-break-inside: avoid;
            }
            .storyboard-time {
              font-weight: bold;
              color: #666;
              font-size: 9px;
            }
            .storyboard-shot {
              color: #666;
              font-size: 9px;
            }
            .storyboard-spoken {
              font-style: italic;
              font-size: 9px;
            }
            .storyboard-onscreen {
              font-size: 9px;
            }
            .cta-section, .checklist-section {
              background: #f9f9f9;
              padding: 8px;
              border-radius: 4px;
              margin-bottom: 8px;
              page-break-inside: avoid;
            }
            .cta-section h4, .checklist-section h4 {
              font-size: 9px;
              margin-bottom: 4px;
              font-weight: bold;
            }
            .warnings {
              background: #fef2f2;
              border: 1px solid #fecaca;
              padding: 8px;
              border-radius: 4px;
              page-break-inside: avoid;
            }
            .warnings h4 {
              color: #dc2626;
              font-size: 9px;
              margin-bottom: 4px;
              font-weight: bold;
            }
            ul {
              margin-left: 15px;
              font-size: 9px;
            }
            li {
              margin-bottom: 2px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${project.name}</h1>
            <p>Scripts Pack - ${completedScripts.length} Scripts</p>
          </div>

          <div class="section">
            <h3 class="section-title">Project Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <h4>Product</h4>
                <p>${project.productDescription.substring(0, 250)}${project.productDescription.length > 250 ? "..." : ""}</p>
              </div>
              ${
                project.offer
                  ? `
                <div class="summary-item">
                  <h4>Offer</h4>
                  <p>${project.offer}</p>
                </div>
              `
                  : ""
              }
              ${
                usedPersonas.length > 0
                  ? `
                <div class="summary-item">
                  <h4>Target Audiences</h4>
                  <ul>${personasList}</ul>
                </div>
              `
                  : ""
              }
              ${
                project.brandVoice
                  ? `
                <div class="summary-item">
                  <h4>Brand Voice</h4>
                  <p>${project.brandVoice}</p>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          ${scriptsHtml}
        </body>
      </html>
    `;
  }

  private renderScriptCard(script: Script): string {
    const storyboard = script.storyboard as StoryboardStep[] | null;

    const storyboardHtml = storyboard
      ? storyboard
          .map(
            (step) => `
          <div class="storyboard-step">
            <div class="storyboard-time">${step.t}</div>
            <div class="storyboard-shot">Shot: ${step.shot}</div>
            <div class="storyboard-spoken">"${step.spoken}"</div>
            ${step.onScreen ? `<div class="storyboard-onscreen">On-screen: ${step.onScreen}</div>` : ""}
          </div>
        `,
          )
          .join("")
      : "";

    const ctaHtml =
      script.ctaVariants.length > 0
        ? `
        <div class="cta-section">
          <h4>CTA Variants</h4>
          <ul>
            ${script.ctaVariants.map((cta) => `<li>${cta}</li>`).join("")}
          </ul>
        </div>
      `
        : "";

    const checklistHtml =
      script.filmingChecklist.length > 0
        ? `
        <div class="checklist-section">
          <h4>Filming Checklist</h4>
          <ul>
            ${script.filmingChecklist.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      `
        : "";

    const warningsHtml =
      script.warnings.length > 0
        ? `
        <div class="warnings">
          <h4>Warnings</h4>
          <ul>
            ${script.warnings.map((w) => `<li>${w}</li>`).join("")}
          </ul>
        </div>
      `
        : "";

    return `
      <div class="script-card">
        <div class="script-header">
          <div class="script-meta">
            <span>${script.duration}s</span>
          </div>
        </div>
        <div class="script-body">
          <div class="hook">${script.hook || "No hook"}</div>
          <div class="storyboard">
            <h4>Storyboard</h4>
            ${storyboardHtml}
          </div>
          ${ctaHtml}
          ${checklistHtml}
          ${warningsHtml}
        </div>
      </div>
    `;
  }

  private formatAngle(angle: string): string {
    return angle
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
