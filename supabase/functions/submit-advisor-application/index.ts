import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Input validation helpers
const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== "string" || email.length > 255) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateName = (name: string): boolean => {
  if (!name || typeof name !== "string") return false;
  if (name.length < 2 || name.length > 50) return false;
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name);
};

const validateInstagram = (handle: string): boolean => {
  if (!handle || typeof handle !== "string") return false;
  // Strip @ if present
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
  if (cleanHandle.length < 1 || cleanHandle.length > 30) return false;
  const instagramRegex = /^[a-zA-Z0-9._]+$/;
  return instagramRegex.test(cleanHandle);
};

const validateBio = (bio: string): boolean => {
  if (!bio || typeof bio !== "string") return false;
  if (bio.length < 50 || bio.length > 1000) return false;
  return true;
};

const validateSpecialty = (specialty: string): boolean => {
  if (!specialty || typeof specialty !== "string") return false;
  if (specialty.length < 2 || specialty.length > 100) return false;
  return true;
};

const validateUrl = (url: string | null | undefined): boolean => {
  if (!url || url === "") return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validatePhone = (phone: string | null | undefined): boolean => {
  if (!phone || phone === "") return true; // Optional field
  if (typeof phone !== "string" || phone.length > 20) return false;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  return phoneRegex.test(phone);
};

interface ApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialty: string;
  experience?: string;
  bio: string;
  virtual: boolean;
  inPerson: boolean;
  instagram: string;
  tiktok?: string;
  linkedin?: string;
  portfolio?: string;
  selfieBase64?: string;
  idBase64?: string;
  selfieFileName?: string;
  idFileName?: string;
  livenessVerified?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("submit-advisor-application: Starting request processing");

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the authorization header to verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required. Please sign in to submit your application." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create a client with the user's auth token to verify authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated by getting their user info
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error("Invalid auth token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication. Please sign in again." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userId = userData.user.id;
    console.log("submit-advisor-application: Authenticated user:", userId);

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const body: ApplicationData = await req.json();

    // Validate all required fields server-side
    const validationErrors: string[] = [];

    if (!validateName(body.firstName)) {
      validationErrors.push("Invalid first name");
    }
    if (!validateName(body.lastName)) {
      validationErrors.push("Invalid last name");
    }
    if (!validateEmail(body.email)) {
      validationErrors.push("Invalid email");
    }
    if (!validateSpecialty(body.specialty)) {
      validationErrors.push("Invalid specialty");
    }
    if (!validateBio(body.bio)) {
      validationErrors.push("Bio must be between 50 and 1000 characters");
    }
    if (!validateInstagram(body.instagram)) {
      validationErrors.push("Invalid Instagram handle");
    }
    if (!validatePhone(body.phone)) {
      validationErrors.push("Invalid phone number");
    }
    if (!validateUrl(body.portfolio)) {
      validationErrors.push("Invalid portfolio URL");
    }
    if (!validateUrl(body.linkedin)) {
      validationErrors.push("Invalid LinkedIn URL");
    }

    // Validate files are provided
    if (!body.selfieBase64 || !body.idBase64) {
      validationErrors.push("Verification photos are required");
    }

    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validationErrors }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user already has a pending or approved application
    const { data: existingApp, error: existingError } = await supabaseAdmin
      .from("advisor_applications")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing application:", existingError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing applications" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (existingApp) {
      const message = existingApp.status === "pending" 
        ? "You already have a pending application"
        : existingApp.status === "approved"
        ? "Your application has already been approved"
        : "You have an existing application. Please contact support.";
      
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Upload verification documents to storage
    let selfieUrl: string | null = null;
    let idUrl: string | null = null;

    if (body.selfieBase64 && body.selfieFileName) {
      try {
        // Decode base64
        const selfieData = body.selfieBase64.split(",")[1];
        const selfieBytes = Uint8Array.from(atob(selfieData), c => c.charCodeAt(0));
        
        // Validate file size (max 5MB)
        if (selfieBytes.length > 5 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: "Selfie file too large (max 5MB)" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        const selfieExtension = body.selfieFileName.split(".").pop() || "jpg";
        const selfiePath = `${userId}/selfie_${Date.now()}.${selfieExtension}`;
        
        const { error: selfieUploadError } = await supabaseAdmin.storage
          .from("verifications")
          .upload(selfiePath, selfieBytes, {
            contentType: `image/${selfieExtension}`,
            upsert: false,
          });

        if (selfieUploadError) {
          console.error("Selfie upload error:", selfieUploadError);
          return new Response(
            JSON.stringify({ error: "Failed to upload selfie" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        selfieUrl = selfiePath;
        console.log("Selfie uploaded:", selfiePath);
      } catch (e) {
        console.error("Error processing selfie:", e);
        return new Response(
          JSON.stringify({ error: "Failed to process selfie" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    if (body.idBase64 && body.idFileName) {
      try {
        // Decode base64
        const idData = body.idBase64.split(",")[1];
        const idBytes = Uint8Array.from(atob(idData), c => c.charCodeAt(0));
        
        // Validate file size (max 5MB)
        if (idBytes.length > 5 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: "ID file too large (max 5MB)" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        const idExtension = body.idFileName.split(".").pop() || "jpg";
        const idPath = `${userId}/id_${Date.now()}.${idExtension}`;
        
        const { error: idUploadError } = await supabaseAdmin.storage
          .from("verifications")
          .upload(idPath, idBytes, {
            contentType: `image/${idExtension}`,
            upsert: false,
          });

        if (idUploadError) {
          console.error("ID upload error:", idUploadError);
          return new Response(
            JSON.stringify({ error: "Failed to upload ID document" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        idUrl = idPath;
        console.log("ID uploaded:", idPath);
      } catch (e) {
        console.error("Error processing ID:", e);
        return new Response(
          JSON.stringify({ error: "Failed to process ID document" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Clean instagram handle
    const instagramHandle = body.instagram.startsWith("@") 
      ? body.instagram.slice(1) 
      : body.instagram;

    // Insert application into database
    // Only set liveness_verified to true if the client reports it as verified
    const livenessVerified = body.livenessVerified === true;
    
    const { data: application, error: insertError } = await supabaseAdmin
      .from("advisor_applications")
      .insert({
        user_id: userId,
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        email: body.email.toLowerCase().trim(),
        phone: body.phone?.trim() || null,
        specialty: body.specialty.trim(),
        experience: body.experience?.trim() || null,
        bio: body.bio.trim(),
        virtual: body.virtual ?? true,
        in_person: body.inPerson ?? false,
        instagram: instagramHandle,
        tiktok: body.tiktok?.trim() || null,
        linkedin: body.linkedin?.trim() || null,
        portfolio: body.portfolio?.trim() || null,
        selfie_url: selfieUrl,
        id_document_url: idUrl,
        status: "pending",
        liveness_verified: livenessVerified,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit application" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update the user's profile to mark them as an advisor (pending approval)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_advisor: true,
        advisor_approved: false,
        advisor_status: "pending",
        full_name: `${body.firstName.trim()} ${body.lastName.trim()}`,
        specialty: body.specialty.trim(),
        bio: body.bio.trim(),
        instagram_url: instagramHandle,
        virtual_available: body.virtual ?? true,
        in_person_available: body.inPerson ?? false,
      })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail the whole request, application is already created
    }

    // Create advisor_profiles record with pending status
    // This is critical for the organic approval flow
    const { error: advisorProfileError } = await supabaseAdmin
      .from("advisor_profiles")
      .upsert({
        user_id: userId,
        application_status: "pending",
        onboarding_status: "pending",
        is_listed: false,
        is_published: false,
        bio: body.bio.trim(),
      }, {
        onConflict: "user_id",
      });

    if (advisorProfileError) {
      console.error("Advisor profile creation error:", advisorProfileError);
      // Don't fail the whole request
    }

    // Add advisor_applicant role to user_roles table
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "advisor_applicant",
      }, {
        onConflict: "user_id,role",
        ignoreDuplicates: true,
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      // Don't fail the whole request
    }

    console.log("Application submitted successfully:", application.id);

    // Notify admin (best-effort, never blocks success)
    try {
      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (adminEmail && resendKey) {
        const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`;
        const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#1a1a1a;background:#FAF8F5;padding:24px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;">
            <div style="text-align:center;letter-spacing:2px;font-weight:500;font-size:18px;margin-bottom:24px;">COOK A LOOK</div>
            <h1 style="font-weight:400;font-size:22px;text-align:center;">New advisor awaiting approval</h1>
            <p><strong>${fullName}</strong> has submitted an advisor application.</p>
            <ul>
              <li><strong>Email:</strong> ${body.email}</li>
              <li><strong>Specialty:</strong> ${body.specialty}</li>
            </ul>
            <p style="text-align:center;margin:28px 0;">
              <a href="https://cookalook.com/admin/advisors" style="background:#1a1a1a;color:#fff;padding:12px 28px;text-decoration:none;letter-spacing:1px;font-size:14px;">REVIEW IN ADMIN</a>
            </p>
          </div></body></html>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "Cook A Look <notify@cookalook.com>",
            to: adminEmail,
            subject: `New advisor application: ${fullName}`,
            html,
          }),
        });
      }
    } catch (e) {
      console.error("admin notify failed", e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        applicationId: application.id,
        message: "Application submitted successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in submit-advisor-application function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
