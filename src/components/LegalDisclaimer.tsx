export default function LegalDisclaimer({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center no-print">
        본 계산 결과 및 서류는 참고용이며 법적 효력을 보장하지 않습니다. 최종
        판단은 공인노무사·세무사에게 문의하세요.
      </p>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-6 no-print">
      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <span className="font-semibold">법적 고지:</span> 본 서비스에서 제공하는
        계산 결과 및 서류 양식은 <strong>참고용</strong>이며, 법적 효력을
        보장하지 않습니다. 법령 개정·개별 사업장 사정에 따라 실제 적용 결과가
        다를 수 있으므로, 최종 신고·제출 전 반드시 공인노무사 또는 세무사의
        검토를 받으시기 바랍니다. 이로 인한 법적 책임은 사용자에게 있습니다.
        (2026년 근로기준법·근로자퇴직급여보장법·4대보험 관계 법령 기준)
      </p>
    </div>
  );
}
