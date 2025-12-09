/**
 * Prescription PDF Generator
 * Uses jsPDF to create printable prescriptions
 */

import { PrescriptionItem } from '../types';

export interface PrescriptionData {
  // Doctor Info
  doctorName: string;
  doctorNameBn?: string;
  doctorDegrees: string;
  doctorSpecialty: string;
  doctorBmdcNo: string;
  chamberName: string;
  chamberAddress: string;
  chamberPhone?: string;

  // Patient Info
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone?: string;
  patientId?: string;

  // Prescription
  date: string;
  serialNumber?: number;
  diagnosis: string;
  diagnosisBn?: string;
  clinicalNotes?: string;
  medicines: PrescriptionItem[];
  advice?: string[];
  followUpDate?: string;
  referral?: string;
}

/**
 * Generate prescription as HTML (for preview and print)
 */
export function generatePrescriptionHTML(data: PrescriptionData): string {
  const medicinesHTML = data.medicines.map((med, i) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${med.medicine}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${med.dosage}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${med.duration}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${med.instruction}</td>
    </tr>
  `).join('');

  const adviceHTML = data.advice?.length ? `
    <div style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
      <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">📋 পরামর্শ / Advice:</h4>
      <ul style="margin: 0; padding-left: 20px; color: #166534;">
        ${data.advice.map(a => `<li style="margin: 4px 0;">${a}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription - ${data.patientName}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Noto Sans Bengali', 'Segoe UI', sans-serif; 
      margin: 0; 
      padding: 20px;
      background: #f8fafc;
    }
    .prescription-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    @media print {
      body { 
        background: white; 
        padding: 0;
      }
      .prescription-container {
        box-shadow: none;
        border-radius: 0;
      }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="prescription-container">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h1 style="margin: 0; font-size: 24px;">${data.doctorNameBn || data.doctorName}</h1>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${data.doctorDegrees}</p>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${data.doctorSpecialty}</p>
          <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.8;">BMDC: ${data.doctorBmdcNo}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: 600;">${data.chamberName}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">${data.chamberAddress}</p>
          ${data.chamberPhone ? `<p style="margin: 4px 0 0 0; font-size: 14px;">📞 ${data.chamberPhone}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Patient Info -->
    <div style="padding: 20px; border-bottom: 2px solid #e2e8f0; background: #f8fafc;">
      <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <span style="color: #64748b; font-size: 12px;">রোগীর নাম / Patient Name</span>
          <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 16px;">${data.patientName}</p>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px;">বয়স / Age</span>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${data.patientAge} years</p>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px;">লিঙ্গ / Gender</span>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${data.patientGender}</p>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px;">তারিখ / Date</span>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${data.date}</p>
        </div>
        ${data.serialNumber ? `
        <div>
          <span style="color: #64748b; font-size: 12px;">সিরিয়াল / Serial</span>
          <p style="margin: 4px 0 0 0; font-weight: 600;">#${data.serialNumber}</p>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Diagnosis -->
    <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
      <h3 style="margin: 0 0 12px 0; color: #0d9488; font-size: 16px;">
        <span style="margin-right: 8px;">🔍</span>রোগ নির্ণয় / Diagnosis
      </h3>
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">
        ${data.diagnosisBn || data.diagnosis}
      </p>
      ${data.clinicalNotes ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">${data.clinicalNotes}</p>` : ''}
    </div>

    <!-- Rx Symbol & Medicines -->
    <div style="padding: 20px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span style="font-size: 32px; font-weight: bold; color: #0d9488;">℞</span>
        <h3 style="margin: 0; color: #1e293b;">ওষুধের তালিকা / Medicines</h3>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; width: 40px;">#</th>
            <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">ওষুধ / Medicine</th>
            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; font-weight: 600; width: 100px;">মাত্রা / Dose</th>
            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; font-weight: 600; width: 100px;">সময়কাল / Duration</th>
            <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">নির্দেশনা / Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${medicinesHTML}
        </tbody>
      </table>

      ${adviceHTML}

      ${data.followUpDate ? `
      <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
        <p style="margin: 0; color: #1e40af;">
          <span style="font-weight: 600;">📅 পরবর্তী ভিজিট / Follow-up:</span> ${data.followUpDate}
        </p>
      </div>
      ` : ''}

      ${data.referral ? `
      <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
        <p style="margin: 0; color: #92400e;">
          <span style="font-weight: 600;">🏥 রেফার / Referral:</span> ${data.referral}
        </p>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="padding: 20px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
      <div style="display: flex; justify-content: space-between; align-items: end;">
        <div>
          <p style="margin: 0; font-size: 12px; color: #64748b;">
            🏥 This prescription is digitally generated via Nirnoy Health Platform
          </p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
            www.nirnoy.health | For queries: support@nirnoy.health
          </p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">${data.doctorName}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${data.doctorSpecialty}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Print Button -->
  <div class="no-print" style="text-align: center; margin-top: 20px;">
    <button onclick="window.print()" style="padding: 12px 24px; background: #0d9488; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600;">
      🖨️ প্রিন্ট / Print Prescription
    </button>
    <button onclick="downloadAsPDF()" style="margin-left: 12px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600;">
      📥 ডাউনলোড PDF
    </button>
  </div>

  <script>
    function downloadAsPDF() {
      // For simplicity, just trigger print which allows Save as PDF
      window.print();
    }
  </script>
</body>
</html>
  `;
}

/**
 * Open prescription in new window for print/download
 */
export function openPrescriptionWindow(data: PrescriptionData): void {
  const html = generatePrescriptionHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Download prescription as PNG/Image using html2canvas (requires library)
 * Fallback to print if html2canvas not available
 */
export async function downloadPrescriptionAsImage(data: PrescriptionData): Promise<void> {
  // This would use html2canvas in production
  // For now, fallback to print dialog which allows Save as PDF
  openPrescriptionWindow(data);
}

export default {
  generatePrescriptionHTML,
  openPrescriptionWindow,
  downloadPrescriptionAsImage,
};

