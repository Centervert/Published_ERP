import { useSearchParams } from "react-router-dom";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Unsubscribed() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") !== "false";
  const brand = searchParams.get("brand") || "Author Services";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf9f5] to-[#f5f3ee]">
      {/* Header */}
      <header className="bg-[#faf9f5] border-b border-[#1a1a2e]/10 px-10 py-6">
        <img
          src="https://rifdcupojdwfsteoqtpw.supabase.co/storage/v1/object/public/imprint-assets/author-services/logo.png"
          alt={brand}
          className="h-12 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-10">
        <div className="text-center max-w-md bg-white p-12 rounded-2xl shadow-lg">
          <div
            className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
              success ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {success ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
          </div>

          <h1 className="font-serif text-3xl font-semibold text-[#1a1a2e] mb-4">
            {success ? "You've Been Unsubscribed" : "Something Went Wrong"}
          </h1>

          <p className="text-gray-600 leading-relaxed mb-8">
            {success
              ? "We're sorry to see you go. You will no longer receive marketing emails from us. If this was a mistake or you change your mind, you can always re-subscribe by contacting us."
              : "We couldn't process your unsubscribe request. Please try again or contact us directly if the problem persists."}
          </p>

          <Button
            asChild
            className="bg-[#1a1a2e] hover:bg-[#16213e] text-white px-7 py-3 h-auto"
          >
            <a href="https://authorservices.com">Visit Our Website</a>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white/70 py-8 px-10 text-center">
        <div className="font-serif text-lg text-white mb-3">{brand}</div>
        <div className="text-sm leading-relaxed">
          555 Winderley Pl Suite 225
          <br />
          Maitland, FL 32751
          <br />
          866-381-2665
          <br />
          <br />
          Questions?{" "}
          <a
            href="mailto:support@authorservices.com"
            className="text-white/90 underline hover:text-white"
          >
            Contact Us
          </a>
        </div>
      </footer>
    </div>
  );
}
