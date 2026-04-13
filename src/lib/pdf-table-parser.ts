/**
 * PDF 표(table) 추출 유틸리티
 *
 * pdfjs-dist로 텍스트 아이템의 (x, y) 좌표를 읽어서
 * 같은 y좌표 → 같은 행, x좌표 순서 → 컬럼으로 재구성합니다.
 */

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

/**
 * PDF 파일(ArrayBuffer)에서 표 데이터를 추출합니다.
 * @returns [헤더행, ...데이터행] 형태의 2D 문자열 배열
 */
export async function extractTableFromPdf(
  buffer: ArrayBuffer,
): Promise<string[][]> {
  // dynamic import로 pdfjs-dist 로드 (클라이언트 전용)
  const pdfjsLib = await import("pdfjs-dist");

  // worker 설정 — CDN fallback
  if (typeof window !== "undefined") {
    const version = pdfjsLib.version;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
  }

  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allItems: TextItem[] = [];

  // 모든 페이지에서 텍스트 추출
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;
    const content = await page.getTextContent();

    for (const item of content.items) {
      // TextItem 타입만 처리 (TextMarkedContent 제외)
      if (!("str" in item) || !item.str.trim()) continue;

      const tx = item.transform;
      allItems.push({
        str: item.str.trim(),
        x: Math.round(tx[4]), // x 좌표
        // 다중 페이지: 페이지 오프셋으로 전역 y좌표 생성 (첫 페이지가 가장 큰 y)
        y: Math.round(tx[5]) + (doc.numPages - p) * pageHeight,
        width: Math.round(item.width),
      });
    }
  }

  if (allItems.length === 0) return [];

  // 1. y좌표로 행 그룹핑 (±3px 오차 허용)
  const rows = groupByY(allItems, 3);

  // 2. 각 행 내에서 x좌표로 정렬
  rows.forEach((row) => row.sort((a, b) => a.x - b.x));

  // 3. 컬럼 경계 감지 — 첫 번째 행(헤더)의 x좌표를 기준으로
  const colBoundaries = detectColumnBoundaries(rows);

  // 4. 각 행의 텍스트를 컬럼에 할당
  const result: string[][] = [];
  for (const row of rows) {
    const cells = assignToCols(row, colBoundaries);
    // 완전히 빈 행은 건너뛰기
    if (cells.every((c) => !c)) continue;
    result.push(cells);
  }

  return result;
}

/** y좌표가 비슷한(±tolerance) 아이템들을 같은 행으로 묶기 */
function groupByY(items: TextItem[], tolerance: number): TextItem[][] {
  // y 내림차순 정렬 (PDF는 아래→위 좌표계이므로 큰 y가 위쪽)
  const sorted = [...items].sort((a, b) => b.y - a.y);

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentY) <= tolerance) {
      currentRow.push(sorted[i]);
    } else {
      rows.push(currentRow);
      currentRow = [sorted[i]];
      currentY = sorted[i].y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return rows;
}

/** 모든 행의 x좌표를 분석해서 컬럼 경계를 감지 (centroid clustering) */
function detectColumnBoundaries(rows: TextItem[][]): number[] {
  // 모든 텍스트 아이템의 x좌표를 수집
  const allX: number[] = [];
  for (const row of rows) {
    for (const item of row) {
      allX.push(item.x);
    }
  }

  if (allX.length === 0) return [];

  allX.sort((a, b) => a - b);

  // centroid 기반 클러스터링: 클러스터 평균으로부터 ±tolerance px 이내면 같은 클러스터
  const tolerance = 15;
  const clusters = clusterXCoords(allX, tolerance);

  // 컬럼 수가 너무 많으면 더 큰 간격으로 재시도
  if (clusters.length > 20) {
    return clusterXCoords(allX, 30);
  }

  return clusters;
}

/** x좌표를 centroid 기반으로 클러스터링 */
function clusterXCoords(sortedX: number[], tolerance: number): number[] {
  const clusters: { center: number; count: number }[] = [];

  for (const x of sortedX) {
    const existing = clusters.find((c) => Math.abs(c.center - x) <= tolerance);
    if (existing) {
      // 가중 평균으로 중심 업데이트
      existing.center =
        (existing.center * existing.count + x) / (existing.count + 1);
      existing.count++;
    } else {
      clusters.push({ center: x, count: 1 });
    }
  }

  return clusters
    .sort((a, b) => a.center - b.center)
    .map((c) => Math.round(c.center));
}

/** 행의 텍스트 아이템을 컬럼 경계에 맞춰 할당 */
function assignToCols(row: TextItem[], colBoundaries: number[]): string[] {
  const cells: string[] = new Array(colBoundaries.length).fill("");

  for (const item of row) {
    // 가장 가까운 컬럼 찾기
    let bestCol = 0;
    let bestDist = Math.abs(item.x - colBoundaries[0]);

    for (let c = 1; c < colBoundaries.length; c++) {
      const dist = Math.abs(item.x - colBoundaries[c]);
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = c;
      }
    }

    // 같은 셀에 이미 텍스트가 있으면 공백으로 연결
    cells[bestCol] = cells[bestCol]
      ? `${cells[bestCol]} ${item.str}`
      : item.str;
  }

  return cells;
}
