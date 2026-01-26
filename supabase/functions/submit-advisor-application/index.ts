import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  password: string;
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

const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== "string") return false;
  if (password.length < 8 || password.length > 72) return false;
  return true;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("submit-advisor-application: Starting request processing");

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    if (!validatePassword(body.password)) {
      validationErrors.push("Password must be between 8 and 72 characters");
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

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === body.email.toLowerCase()
    );

    if (emailExists) {
      console.error("Email already registered:", body.email);
      return new Response(
        JSON.stringify({ error: "This email is already registered. Please sign in instead." }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create new auth user
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase().trim(),
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: `${body.firstName.trim()} ${body.lastName.trim()}`,
      },
    });

    if (signUpError || !authData.user) {
      console.error("Signup error:", signUpError?.message);
      return new Response(
        JSON.stringify({ error: signUpError?.message || "Failed to create account" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userId = authData.user.id;
    console.log("submit-advisor-application: User created:", userId);

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

    console.log("Application submitted successfully:", application.id);

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
  } catch (error: any) {
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
