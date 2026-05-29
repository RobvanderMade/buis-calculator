/** Localised pipe validation messages for rowSegmentStatuses / validateLines. */
export function getPipeMessages(t) {
  return {
    noMaterial: t('pipeValidation.noMaterial'),
    noLine: t('pipeValidation.noLine'),
    firstLineMin: (min) => t('pipeValidation.firstLineMin', { min }),
    lastLineMin: t('pipeValidation.lastLineMin'),
    middleLineMin: (min) => t('pipeValidation.middleLineMin', { min }),
    lineOk: t('pipeValidation.lineOk'),
    noLinesToCheck: t('pipeValidation.noLinesToCheck'),
    firstLineTooShort: (min) => t('pipeValidation.firstLineTooShort', { min }),
    lastLineTooShort: t('pipeValidation.lastLineTooShort'),
    lineNTooShort: (row, min) => t('pipeValidation.lineNTooShort', { row, min }),
    allOk: t('pipeValidation.allOk'),
    notAllRowsOk: (rows) => t('pipeValidation.notAllRowsOk', { rows }),
    totalLengthTooLong: (max) => t('calculator.totalLengthTooLong', { max }),
  }
}
