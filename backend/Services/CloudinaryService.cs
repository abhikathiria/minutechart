using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace minutechart.Services
{
    public class CloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration config)
        {
            var acc = new Account(
                config["Cloudinary:CloudName"],
                config["Cloudinary:ApiKey"],
                config["Cloudinary:ApiSecret"]
            );

            _cloudinary = new Cloudinary(acc);
        }

        public async Task<ImageUploadResult> UploadImageAsync(
            IFormFile file,
            string folder,
            string publicId)
        {
            using var stream = file.OpenReadStream();

            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                PublicId = publicId,
                Overwrite = true
                // ✅ ResourceType REMOVED (already implied)
            };

            return await _cloudinary.UploadAsync(uploadParams);
        }

        public async Task DeleteAsync(string publicId)
        {
            await _cloudinary.DestroyAsync(new DeletionParams(publicId));
        }
    }
}
