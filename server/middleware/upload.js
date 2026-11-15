const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      const error = new Error('Only image files are allowed');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'restaurants' },
      (error, result) => {
        if (error) return reject(error);
        return resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );

    stream.end(buffer);
  });
}

function handleImageUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (error) {
      const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 400 : 400);
      return res.status(status).json({
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2MB or smaller' : error.message,
      });
    }
    return next();
  });
}

module.exports = { handleImageUpload, uploadToCloudinary };
