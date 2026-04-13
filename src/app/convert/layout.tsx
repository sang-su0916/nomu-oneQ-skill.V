import LegalDisclaimer from "@/components/LegalDisclaimer";

export default function ConvertLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <LegalDisclaimer />
      </div>
      {children}
    </>
  );
}
