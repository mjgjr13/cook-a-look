import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Camera, Clock, Ban, FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface BiometricConsentScreenProps {
  onConsent: () => void;
}

/**
 * Just-in-time consent screen shown before the live selfie capture and ID
 * upload steps of advisor onboarding. Modeled on Illinois BIPA (740 ILCS
 * 14/15(b))'s written-release requirement: informs the subject, in writing,
 * that a biometric identifier/photo is being collected, the specific
 * purpose and retention period, before collection - plus a no-sale
 * commitment mirroring 740 ILCS 14/15(c). Electronic acceptance below is a
 * "written release" per the Aug. 2024 BIPA amendment (Public Act 103-0769),
 * which added electronic signatures to the definition of "written release."
 * See supabase/migrations/<biometric-retention>.sql and the Privacy Policy
 * "Biometric Data" section for the publicly-posted retention schedule BIPA
 * 15(a) separately requires.
 */
const BiometricConsentScreen = ({ onConsent }: BiometricConsentScreenProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-gold shrink-0 mt-0.5" />
          <div>
            <h3 className="font-serif text-lg font-medium mb-1">
              Before you continue: consent to identity verification photos
            </h3>
            <p className="text-sm text-muted-foreground">
              This step captures photos of your face and government ID to verify your identity.
              Please read this before continuing.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div className="flex gap-3">
            <Camera className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">What we collect</p>
              <p>
                A live photo of your face taken through your camera, and a photo of a
                government-issued ID (passport, driver's license, or national ID). We do not run
                facial-recognition or face-geometry matching software against these photos; a
                human member of our Trust &amp; Safety team reviews them to confirm your identity
                and that your face matches your ID.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <FileText className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Why we collect it</p>
              <p>
                Solely to verify advisor identity before approving an application, to reduce
                impersonation and fraud, and to maintain trust and safety on the platform. This
                photo is kept private and is separate from the public profile photo you upload
                in the previous step.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Clock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">How long we keep it</p>
              <p>
                Both your ID photo and this selfie are retained only as long as needed to
                complete verification and resolve any related dispute, and are automatically and
                permanently deleted no later than one (1) year after your application, or within
                30 days if your application is denied, per our published{" "}
                <Link to="/privacy#biometric-data" className="text-gold hover:underline">
                  biometric data retention schedule
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Ban className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">We will never sell it</p>
              <p>
                We do not sell, lease, trade, or otherwise profit from your photos or any
                biometric information derived from them, and we do not disclose them to third
                parties except service providers who store them on our behalf, or as required by
                law.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3 pt-2 border-t border-border">
          <Checkbox
            id="biometricConsent"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-1"
          />
          <label htmlFor="biometricConsent" className="text-sm leading-relaxed cursor-pointer">
            I have read and understood what photos will be collected, why, how long they will be
            kept, and that they will never be sold. I consent to Cook A Look collecting a live
            selfie and a photo of my government ID for identity verification, as described above
            and in the{" "}
            <Link to="/privacy#biometric-data" target="_blank" className="text-gold hover:underline">
              Privacy Policy
            </Link>
            .
          </label>
        </div>
      </div>

      <Button
        type="button"
        variant="hero"
        className="w-full"
        disabled={!acknowledged}
        onClick={onConsent}
      >
        Agree &amp; Continue to Verification
      </Button>
    </div>
  );
};

export default BiometricConsentScreen;
