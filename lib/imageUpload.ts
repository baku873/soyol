import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with the new account
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'deaycxpgh',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(fileBuffer: Buffer, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'soyol-uploads',
        public_id: fileName.split('.')[0],
      },
      (error: any, result: any) => {
        if (error) {
          reject(error);
        } else if (result?.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(new Error('No secure URL returned from Cloudinary'));
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}