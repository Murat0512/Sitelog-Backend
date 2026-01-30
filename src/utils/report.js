const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'uploads');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toISOString().split('T')[0];
};

const isImage = (mimeType) => ['image/jpeg', 'image/png'].includes(mimeType);

const groupAttachments = (attachments) =>
  attachments.reduce((acc, attachment) => {
    const key = attachment.dailyLog.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(attachment);
    return acc;
  }, {});

const createProjectReport = async ({ res, project, logs, attachments }) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Modern header
  doc.fillColor('#0f172a').fontSize(20).text('Project Progress Report');
  doc.fillColor('#64748b').fontSize(10).text(`Generated: ${formatDate(new Date())}`);
  doc.moveDown(0.6);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(1.2);

  // Project summary block
  doc.fontSize(12).fillColor('#0f172a').text(project.name);
  doc.fontSize(10).fillColor('#475569').text(`Client: ${project.client}`);
  doc.text(`Site Address: ${project.siteAddress}`);
  doc.text(`Status: ${project.status}`);
  doc.text(`Date Range: ${formatDate(logs[logs.length - 1]?.date)} to ${formatDate(logs[0]?.date)}`);
  doc.moveDown(1.4);

  const attachmentMap = groupAttachments(attachments);

  for (let index = 0; index < logs.length; index += 1) {
    const log = logs[index];
    doc.fillColor('#0f172a').fontSize(12).text(`Daily Log · ${formatDate(log.date)}`);
    doc.moveDown(0.4);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.6);

    doc.fontSize(10).fillColor('#0f172a');
    doc.text(`Area: ${log.siteArea}`);
    doc.text(`Activity: ${log.activityType}`);
    doc.text(`Weather: ${log.weather?.condition || log.weather?.type || 'n/a'} ${log.weather?.notes ? `(${log.weather?.notes})` : ''}`);
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#0f172a').text(`Summary: ${log.summary}`);

    if (log.issuesRisks) doc.text(`Issues/Risks: ${log.issuesRisks}`);
    if (log.nextSteps) doc.text(`Next Steps: ${log.nextSteps}`);

    if (log.potentialClaim) {
      doc.moveDown(0.2);
      doc.text('Potential Claim Details:', { underline: true });
      if (log.delayCause) doc.text(`Delay Cause: ${log.delayCause}`);
      if (log.instructionRef) doc.text(`Instruction Ref: ${log.instructionRef}`);
      if (log.impact) doc.text(`Impact: ${log.impact}`);
      if (log.costNote) doc.text(`Cost Note: ${log.costNote}`);
    }

    const logAttachments = attachmentMap[log._id.toString()] || [];
    if (logAttachments.length) {
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#0f172a').text('Attachments');
      doc.moveDown(0.2);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.3);

      for (const attachment of logAttachments) {
        doc.fontSize(9).fillColor('#0f172a').text(`• ${attachment.caption || attachment.fileName || attachment.originalName}`);

        const mimeType = attachment.fileType || attachment.mimeType;
        if (isImage(mimeType)) {
          const filePath = attachment.fileUrl
            ? path.join(uploadDir, attachment.fileUrl.replace('/uploads/', ''))
            : path.join(uploadDir, attachment.filename || '');
          const imagePath = filePath;
          if (fs.existsSync(imagePath)) {
            doc.image(imagePath, { width: 200 });
          }
        }
        doc.moveDown(0.4);
      }
    }

    if (index < logs.length - 1) {
      doc.addPage();
    }
  }

  doc.end();
};

module.exports = { createProjectReport };
