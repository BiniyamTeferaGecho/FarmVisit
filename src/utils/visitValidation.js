export function normalizeStatus(s) {
  if (!s) return ''
  return String(s).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

export function validateCompleteRequirements(schedule = {}, completeData = {}) {
  const statusRaw = schedule.VisitStatus || schedule.Status || schedule.VisitStatusName || schedule.status || ''
  const isInProgress = normalizeStatus(statusRaw) === 'InProgress'
  const actualVisitPresent = Boolean((completeData && (completeData.actualDateTime || completeData.ActualVisitDate)) || (schedule && (schedule.ActualVisitDate || schedule.actualVisitDate)))
  const summaryText = (completeData && (completeData.followUpNotes || completeData.VisitSummary || completeData.visitSummary)) || ''
  const hasSummary = String(summaryText || '').trim().length > 0

  const reasons = []
  if (!isInProgress) reasons.push('Schedule must be In Progress')
  if (!actualVisitPresent) reasons.push('Actual visit date is required')
  if (!hasSummary) reasons.push('Visit summary is required')

  return { ready: reasons.length === 0, reasons, isInProgress, actualVisitPresent, hasSummary }
}
