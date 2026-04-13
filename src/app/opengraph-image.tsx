import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "노무원큐 - 소규모 사업장 노무관리 솔루션";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 80,
          fontWeight: 800,
          color: "white",
          marginBottom: 16,
        }}
      >
        노무원큐
      </div>
      <div style={{ fontSize: 32, color: "#93c5fd", marginBottom: 48 }}>
        소규모 사업장 노무관리 솔루션
      </div>
      <div
        style={{
          display: "flex",
          gap: 24,
        }}
      >
        {["근로계약서", "급여명세서", "4대보험", "퇴직금", "연차관리"].map(
          (item) => (
            <div
              key={item}
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: "12px 24px",
                color: "white",
                fontSize: 22,
              }}
            >
              {item}
            </div>
          ),
        )}
      </div>
      <div style={{ fontSize: 20, color: "#93c5fd", marginTop: 48 }}>
        노무서류 30종 · Start / Pro / Ultra
      </div>
    </div>,
    { ...size },
  );
}
