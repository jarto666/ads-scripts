import { Injectable, Logger } from '@nestjs/common';
import { Project, Persona, Script } from '@prisma/client';

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
  ): Promise<Buffer> {
    // Dynamically import puppeteer to avoid issues if not installed
    let puppeteer: typeof import('puppeteer');
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      this.logger.error('Puppeteer not installed. PDF export unavailable.');
      throw new Error('PDF export not available - puppeteer not installed');
    }

    const html = this.generateHtml(project, scripts);

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
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
  ): string {
    const completedScripts = scripts.filter((s) => s.status === 'completed');

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

    const personasList = project.personas
      .map((p) => `<li><strong>${p.name}</strong>: ${p.description}</li>`)
      .join('');

    const scriptsHtml = Object.entries(scriptsByAngle)
      .map(([angle, angleScripts]) => {
        const scriptCards = angleScripts
          .map((script) => this.renderScriptCard(script))
          .join('');

        return `
          <div class="angle-section">
            <h2 class="angle-title">${this.formatAngle(angle)}</h2>
            ${scriptCards}
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Creator Pack - ${project.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.5;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #000;
            }
            .header h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header p {
              color: #666;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 1px solid #ddd;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .summary-item {
              background: #f9f9f9;
              padding: 10px;
              border-radius: 4px;
            }
            .summary-item h4 {
              font-size: 11px;
              color: #666;
              margin-bottom: 5px;
            }
            .angle-section {
              page-break-inside: avoid;
              margin-bottom: 30px;
            }
            .angle-title {
              font-size: 16px;
              background: #000;
              color: #fff;
              padding: 8px 12px;
              margin-bottom: 15px;
            }
            .script-card {
              border: 1px solid #ddd;
              border-radius: 4px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .script-header {
              background: #f5f5f5;
              padding: 10px;
              border-bottom: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .script-meta {
              display: flex;
              gap: 10px;
            }
            .script-meta span {
              background: #e0e0e0;
              padding: 2px 8px;
              border-radius: 3px;
              font-size: 10px;
            }
            .script-score {
              font-weight: bold;
              font-size: 14px;
            }
            .script-score.high { color: #22c55e; }
            .script-score.medium { color: #eab308; }
            .script-score.low { color: #ef4444; }
            .script-body {
              padding: 15px;
            }
            .hook {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 15px;
              padding: 10px;
              background: #fff3cd;
              border-radius: 4px;
            }
            .storyboard {
              margin-bottom: 15px;
            }
            .storyboard-step {
              border-left: 3px solid #000;
              padding-left: 10px;
              margin-bottom: 10px;
            }
            .storyboard-time {
              font-weight: bold;
              color: #666;
            }
            .storyboard-shot {
              color: #666;
              font-size: 10px;
            }
            .storyboard-spoken {
              font-style: italic;
            }
            .cta-section, .checklist-section {
              background: #f9f9f9;
              padding: 10px;
              border-radius: 4px;
              margin-bottom: 10px;
            }
            .cta-section h4, .checklist-section h4 {
              font-size: 11px;
              margin-bottom: 5px;
            }
            .warnings {
              background: #fef2f2;
              border: 1px solid #fecaca;
              padding: 10px;
              border-radius: 4px;
            }
            .warnings h4 {
              color: #dc2626;
              font-size: 11px;
              margin-bottom: 5px;
            }
            ul {
              margin-left: 20px;
            }
            li {
              margin-bottom: 3px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${project.name}</h1>
            <p>Creator Pack - ${completedScripts.length} Scripts</p>
          </div>

          <div class="section">
            <h3 class="section-title">Project Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <h4>Product</h4>
                <p>${project.productDescription.substring(0, 300)}${project.productDescription.length > 300 ? '...' : ''}</p>
              </div>
              ${
                project.offer
                  ? `
                <div class="summary-item">
                  <h4>Offer</h4>
                  <p>${project.offer}</p>
                </div>
              `
                  : ''
              }
              ${
                project.personas.length > 0
                  ? `
                <div class="summary-item">
                  <h4>Target Audiences</h4>
                  <ul>${personasList}</ul>
                </div>
              `
                  : ''
              }
              ${
                project.brandVoice
                  ? `
                <div class="summary-item">
                  <h4>Brand Voice</h4>
                  <p>${project.brandVoice}</p>
                </div>
              `
                  : ''
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
    const scoreClass =
      (script.score ?? 0) >= 80
        ? 'high'
        : (script.score ?? 0) >= 60
          ? 'medium'
          : 'low';

    const storyboardHtml = storyboard
      ? storyboard
          .map(
            (step) => `
          <div class="storyboard-step">
            <div class="storyboard-time">${step.t}</div>
            <div class="storyboard-shot">Shot: ${step.shot}</div>
            <div class="storyboard-spoken">"${step.spoken}"</div>
            ${step.onScreen ? `<div>On-screen: ${step.onScreen}</div>` : ''}
          </div>
        `,
          )
          .join('')
      : '';

    const ctaHtml =
      script.ctaVariants.length > 0
        ? `
        <div class="cta-section">
          <h4>CTA Variants</h4>
          <ul>
            ${script.ctaVariants.map((cta) => `<li>${cta}</li>`).join('')}
          </ul>
        </div>
      `
        : '';

    const checklistHtml =
      script.filmingChecklist.length > 0
        ? `
        <div class="checklist-section">
          <h4>Filming Checklist</h4>
          <ul>
            ${script.filmingChecklist.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
        : '';

    const warningsHtml =
      script.warnings.length > 0
        ? `
        <div class="warnings">
          <h4>Warnings</h4>
          <ul>
            ${script.warnings.map((w) => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      `
        : '';

    return `
      <div class="script-card">
        <div class="script-header">
          <div class="script-meta">
            <span>${script.duration}s</span>
          </div>
          <div class="script-score ${scoreClass}">${script.score ?? '-'}/100</div>
        </div>
        <div class="script-body">
          <div class="hook">${script.hook || 'No hook'}</div>
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
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
