const CLOUD_NAME = import.meta.env['VITE_CLOUDINARY_CLOUD_NAME'] as string | undefined;
const UPLOAD_PRESET = import.meta.env['VITE_CLOUDINARY_UPLOAD_PRESET'] as string | undefined;

export const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/** Uploads an image to Cloudinary using an unsigned upload preset and returns its secure URL. */
export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Image uploads aren't configured yet. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    throw new Error("Cloudinary upload failed. Check your cloud name and upload preset.");
  }

  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error("Cloudinary did not return an image URL.");
  return json.secure_url;
}
